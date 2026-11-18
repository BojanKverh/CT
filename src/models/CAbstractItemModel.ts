import type { CUndoStack } from "../core/CUndoStack.js";
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

	/**
	 * Counts the rows available below a model item.
	 * @param parent Parent index, or an omitted or invalid index for the root.
	 * @returns Number of rows available under the parent.
	 */
	abstract rowCount(parent?: CModelIndex): number;

	/**
	 * Counts the columns available below a model item.
	 * @param parent Parent index, or an omitted or invalid index for the root.
	 * @returns Number of columns available under the parent.
	 */
	abstract columnCount(parent?: CModelIndex): number;

	/**
	 * Reads the value exposed by a model item.
	 * @param index Index belonging to this model.
	 * @returns The item value, whose type and missing-value convention are defined by the model.
	 */
	abstract data(index: CModelIndex): unknown;

	/**
	 * Provides the subclass hook for writing a value to an item. The base implementation leaves the model unchanged.
	 * @param _index Target index in this model.
	 * @param _value Proposed item value.
	 * @returns Whether the value was accepted. The base implementation returns `false`.
	 */
	setItemData(_index: CModelIndex, _value: unknown): boolean {
		return false;
	}

    /**
     * Provides an overridable hook for applying a batch of textual edits. The base model rejects the operation without changing data.
     * @param _edits Batch of target indexes and text values. The base implementation leaves them untouched.
     * @returns An unsupported-operation error in the base implementation. A supporting implementation returns `null` on success or an error identifying the rejected edit.
     */
    applyTextEdits(_edits: readonly CItemTextEdit[]): CItemTextEditError | null {
        return { editIndex: 0, message: "This model does not support pasting cells." };
    }

    /**
     * Checks whether the model implements the batched text-edit hook.
     * @returns `true` if `applyTextEdits` differs from the base implementation.
     */
    supportsTextEdits(): boolean {
        return this.applyTextEdits !== CAbstractItemModel.prototype.applyTextEdits;
    }

    /**
     * Returns the history of committed edits, if the model provides one.
     * @returns `null`.
     */
    undoStack(): CUndoStack | null {
        return null;
    }

	/**
	 * Queries whether a view may edit an item.
	 * @param _index Index to inspect.
	 * @returns Whether the item is editable. The base implementation returns `false`.
	 */
	isEditable(_index: CModelIndex): boolean {
		return false;
	}

	/**
	 * Provides the subclass hook for column sorting. The base implementation leaves the model unchanged.
	 * @param _column Zero-based sort column.
	 * @param _order Requested sort order. Defaults to ascending.
	 */
	sort(
		_column: number,
		_order: CSortOrder = CSortOrder.AscendingOrder
	): void {
	}

	/**
	 * Creates an index after checking row and column bounds under the given parent.
	 * @param row Zero-based row coordinate.
	 * @param column Zero-based column coordinate.
	 * @param parent Parent index. Defaults to an invalid root index.
	 * @returns A new index owned by this model, or an invalid index when the coordinates are outside the model.
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
	 * Looks up an item's parent. The base implementation represents a flat model.
	 * @param _index Item index whose parent is requested.
	 * @returns A new invalid index in the base implementation.
	 */
	parentIndex(_index: CModelIndex): CModelIndex {
		return new CModelIndex();
	}

	/**
	 * Supplies a default one-based label for a header section.
	 * @param section Zero-based section number.
	 * @param _orientation Header orientation. The default implementation uses the same numbering on both axes.
	 * @returns The section number plus one.
	 */
	headerData(section: number, _orientation: COrientation): string | number | null {
		return section + 1;
	}

	/**
	 * Constructs an index with this model as its owner without validating bounds.
	 * @param row Zero-based row coordinate.
	 * @param column Zero-based column coordinate.
	 * @param data Optional internal item payload. Defaults to `null`.
	 * @returns A new index owned by this model.
	 */
	protected createIndex(row: number, column: number,
		data: unknown = null): CModelIndex {
		return new CModelIndex(row, column, data, this);
	}

	/**
	 * Queries whether the model can load another block of rows.
	 * @param _parent Parent under which to fetch, defaulting to the root.
	 * @returns Always `false` in the base implementation.
	 */
	canFetchMore(_parent = new CModelIndex()): boolean {
		return false;
	}

	/**
	 * Provides an asynchronous hook for loading additional rows. The base implementation performs no load.
	 * @param _parent Parent under which to fetch, defaulting to the root.
	 * @returns A promise resolving to `false` in the base implementation.
	 */
	async fetchMore(_parent = new CModelIndex()): Promise<boolean> {
		return false;
	}

	/**
	 * Notifies observers that values changed in an inclusive index range.
	 * @param topLeft Index at the upper-left corner of the changed range.
	 * @param bottomRight Index at the lower-right corner of the changed range.
	 */
	protected emitDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		this.dataChanged.emit(topLeft, bottomRight);
	}

	/** Emits `modelReset` so observers can discard and rebuild their model state. */
	protected resetModel(): void {
		this.modelReset.emit();
	}

	/** Emits `layoutAboutToBeChanged` before indexes are rearranged. */
	protected beginLayoutChange(): void {
		this.layoutAboutToBeChanged.emit();
	}

	/**
	 * Emits the completed index mapping. Mappings with unequal array lengths are ignored.
	 * @param oldIndexes Indexes before the rearrangement.
	 * @param newIndexes Corresponding indexes afterwards, in the same order.
	 */
	protected endLayoutChange(
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): void {
		if (oldIndexes.length !== newIndexes.length)
			return;

		this.layoutChanged.emit(oldIndexes, newIndexes);
	}

	/**
	 * Records an insertion and notifies observers before rows are added. Throws for an overlapping change, a foreign parent or an invalid range.
	 * @param parent Parent index, or an invalid index for the root.
	 * @param first First zero-based inserted row. May equal the current row count to append.
	 * @param last Last zero-based inserted row, inclusive.
	 */
	protected beginInsertRows(
		parent: CModelIndex,
		first: number,
		last: number
	): void {
		this.#beginRowsChange("insert", parent, first, last);
		this.rowsAboutToBeInserted.emit(parent, first, last);
	}

	/** Finishes the pending insertion and emits `rowsInserted`. Throws if no insertion is pending. */
	protected endInsertRows(): void {
		const change = this.#takeRowsChange("insert");
		this.rowsInserted.emit(change.parent, change.first, change.last);
	}

	/**
	 * Records a removal and notifies observers before rows are removed. Throws for an overlapping change, a foreign parent or an invalid range.
	 * @param parent Parent index, or an invalid index for the root.
	 * @param first First zero-based existing row to remove.
	 * @param last Last zero-based existing row to remove, inclusive.
	 */
	protected beginRemoveRows(
		parent: CModelIndex,
		first: number,
		last: number
	): void {
		this.#beginRowsChange("remove", parent, first, last);
		this.rowsAboutToBeRemoved.emit(parent, first, last);
	}

	/** Finishes the pending removal and emits `rowsRemoved`. Throws if no removal is pending. */
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
