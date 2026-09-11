import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CModelIndex } from "./CModelIndex.js";
import { COrientation } from "../gui/COrientation.js";

/**
 * Abstract base class for models that expose data to item views.
 */
export abstract class CAbstractItemModel extends CObject {
	/** Emitted when data in the inclusive index range has changed. */
	readonly dataChanged =
		new CSignal<[CModelIndex, CModelIndex]>();

	/** Emitted when the model has been reset. */
	readonly modelReset = new CSignal<[]>();

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
	 * Returns whether the item at an index can be edited.
	 *
	 * The base implementation returns `false`.
	 */
	isEditable(_index: CModelIndex): boolean {
		return false;
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
}
