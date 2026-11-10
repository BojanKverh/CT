import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CModelIndex } from "./CModelIndex.js";
import { COrientation } from "../gui/COrientation.js";
import { CSortOrder } from "../gui/CSortOrder.js";

export type CItemTextEdit = { index: CModelIndex; text: string };
export type CItemTextEditError = { editIndex: number; message: string };

/**
 * Abstract base class for models that expose data to item views.
 */
export abstract class CAbstractItemModel extends CObject {
	/** Emitted when data in the inclusive index range has changed. */
	readonly dataChanged =
		new CSignal<[CModelIndex, CModelIndex]>();

	/** Emitted when the model has been reset. */
	readonly modelReset = new CSignal<[]>();

	/** Emitted immediately before indexes are rearranged. */
	readonly layoutAboutToBeChanged = new CSignal<[]>();

	/** Emitted after indexes have been rearranged. */
	readonly layoutChanged =
		new CSignal<[CModelIndex[], CModelIndex[]]>();

	/** Emitted immediately before a contiguous range of rows is inserted. */
	readonly rowsAboutToBeInserted =
		new CSignal<[CModelIndex, number, number]>();

	/** Emitted after a contiguous range of rows has been inserted. */
	readonly rowsInserted =
		new CSignal<[CModelIndex, number, number]>();

	/** Emitted immediately before a contiguous range of rows is removed. */
	readonly rowsAboutToBeRemoved =
		new CSignal<[CModelIndex, number, number]>();

	/** Emitted after a contiguous range of rows has been removed. */
	readonly rowsRemoved =
		new CSignal<[CModelIndex, number, number]>();

	#m_pendingRowsChange: {
		type: "insert" | "remove";
		parent: CModelIndex;
		first: number;
		last: number;
	} | null = null;

	/**
	 * Creates an item model.
	 *
	 * @param parent Optional parent object.
	 */
	constructor(parent: CObject | null = null) {
		super(parent);
	}

	/** Returns the number of rows below the optional parent index. */
	abstract rowCount(parent?: CModelIndex): number;

	/** Returns the number of columns below the optional parent index. */
	abstract columnCount(parent?: CModelIndex): number;

	/** Returns the data associated with an index. */
	abstract data(index: CModelIndex): unknown;

	/**
	 * Sets the data associated with an index.
	 *
	 * The base implementation does not modify the model.
	 *
	 * @returns `true` when the value was accepted.
	 */
	setItemData(_index: CModelIndex, _value: unknown): boolean {
		return false;
	}

    /**
     * Validates all pasted values before writing any of them.
     * Return null on success or identify the rejected edit. Models opt in by overriding this method.
     */
    applyTextEdits(_edits: readonly CItemTextEdit[]): CItemTextEditError | null {
        return { editIndex: 0, message: "This model does not support pasting cells." };
    }

	/**
	 * Returns whether the item at an index can be edited.
	 *
	 * The base implementation returns `false`.
	 */
	isEditable(_index: CModelIndex): boolean {
		return false;
	}

	/**
	 * Sorts the model by a column in the requested order.
	 *
	 * The base implementation does not modify the model.
	 */
	sort(
		_column: number,
		_order: CSortOrder = CSortOrder.AscendingOrder
	): void {
	}

	/**
	 * Creates an index for an existing row and column.
	 *
	 * Returns an invalid index when the coordinates are outside the model.
	 */
	index(row: number, column: number,
		parent = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0)
			return new CModelIndex();

		if (row >= this.rowCount(parent) ||
			column >= this.columnCount(parent))
			return new CModelIndex();

		return this.createIndex(row, column);
	}

	/**
	 * Returns the parent index of an item.
	 *
	 * The base implementation represents a flat model and returns an invalid
	 * index.
	 */
	parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}

	/**
	 * Returns display data for a header section.
	 *
	 * The default implementation returns a one-based section number.
	 */
	headerData(section: number, _orientation: COrientation): string | number | null {
		return section + 1;
	}

	/**
	 * Creates a model index owned by this model.
	 *
	 * @param row Zero-based row.
	 * @param column Zero-based column.
	 * @param data Optional internal data associated with the index.
	 */
	protected createIndex(row: number, column: number,
		data: unknown = null): CModelIndex {
		return new CModelIndex(row, column, data, this);
	}

	/** Returns whether another block of rows can be fetched. */
	canFetchMore(_parent = new CModelIndex()): boolean {
		return false;
	}

	/** Fetches another block of rows. The base implementation does nothing. */
	async fetchMore(_parent = new CModelIndex()): Promise<boolean> {
		return false;
	}

	/** Emits the dataChanged signal for the specified inclusive range. */
	protected emitDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		this.dataChanged.emit(topLeft, bottomRight);
	}

	/** Resets the model and emits the modelReset signal. */
	protected resetModel(): void {
		this.modelReset.emit();
	}

	/** Announces that model indexes are about to be rearranged. */
	protected beginLayoutChange(): void {
		this.layoutAboutToBeChanged.emit();
	}

	/** Announces a completed index rearrangement. */
	protected endLayoutChange(
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): void {
		if (oldIndexes.length !== newIndexes.length)
			return;

		this.layoutChanged.emit(oldIndexes, newIndexes);
	}

	/** Announces that rows will be inserted before the model data changes. */
	protected beginInsertRows(
		parent: CModelIndex,
		first: number,
		last: number
	): void {
		this.#beginRowsChange("insert", parent, first, last);
		this.rowsAboutToBeInserted.emit(parent, first, last);
	}

	/** Announces that the previously declared rows have been inserted. */
	protected endInsertRows(): void {
		const change = this.#takeRowsChange("insert");
		this.rowsInserted.emit(change.parent, change.first, change.last);
	}

	/** Announces that rows will be removed before the model data changes. */
	protected beginRemoveRows(
		parent: CModelIndex,
		first: number,
		last: number
	): void {
		this.#beginRowsChange("remove", parent, first, last);
		this.rowsAboutToBeRemoved.emit(parent, first, last);
	}

	/** Announces that the previously declared rows have been removed. */
	protected endRemoveRows(): void {
		const change = this.#takeRowsChange("remove");
		this.rowsRemoved.emit(change.parent, change.first, change.last);
	}

	#beginRowsChange(
		type: "insert" | "remove",
		parent: CModelIndex,
		first: number,
		last: number
	): void {
		if (this.#m_pendingRowsChange !== null)
			throw new Error("A model row change is already in progress.");
		if (!Number.isInteger(first) || !Number.isInteger(last)
			|| first < 0 || last < first) {
			throw new RangeError("The model row range is invalid.");
		}
		if (parent.isValid() && parent.model() !== this)
			throw new Error("The parent index belongs to another model.");
		const rowCount = this.rowCount(parent);
		if ((type === "insert" && first > rowCount)
			|| (type === "remove" && last >= rowCount)) {
			throw new RangeError("The model row range is outside the model.");
		}

		this.#m_pendingRowsChange = { type, parent, first, last };
	}

	#takeRowsChange(type: "insert" | "remove"): {
		parent: CModelIndex;
		first: number;
		last: number;
	} {
		const change = this.#m_pendingRowsChange;
		if (change === null || change.type !== type)
			throw new Error(`No ${type} row change is in progress.`);

		this.#m_pendingRowsChange = null;
		return change;
	}
}
