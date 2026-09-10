import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

/**
 * Tracks the current index and selected indexes for an item model.
 */
export class CItemSelectionModel extends CObject {
	/** Emitted when the current index changes. */
	readonly currentChanged =
		new CSignal<[CModelIndex, CModelIndex]>();

	/** Emitted with newly selected and deselected indexes. */
	readonly selectionChanged =
		new CSignal<[CModelIndex[], CModelIndex[]]>();

	#m_model: CAbstractItemModel;
	#m_currentIndex = new CModelIndex();
	#m_selectedIndexes: CModelIndex[] = [];

	/** Creates a selection model for the specified item model. */
	constructor(model: CAbstractItemModel, parent: CObject | null = null) {
		super(parent);
		this.#m_model = model;
	}

	/** Returns the item model whose selection is tracked. */
	model(): CAbstractItemModel {
		return this.#m_model;
	}

	/** Returns the current model index. */
	currentIndex(): CModelIndex {
		return this.#m_currentIndex;
	}

	/** Sets the current index if it belongs to the associated model. */
	setCurrentIndex(index: CModelIndex): void {
		if (index.isValid() && index.model() !== this.#m_model)
			return;

		if (this.#m_currentIndex.equals(index))
			return;

		const previous = this.#m_currentIndex;
		this.#m_currentIndex = index;
		this.currentChanged.emit(index, previous);
	}

	/** Returns whether at least one index is selected. */
	hasSelection(): boolean {
		return this.#m_selectedIndexes.length > 0;
	}

	/** Returns whether the specified index is selected. */
	isSelected(index: CModelIndex): boolean {
		return this.#m_selectedIndexes.some(
			selected => selected.equals(index)
		);
	}

	/** Returns a copy of the selected indexes. */
	selectedIndexes(): CModelIndex[] {
		return [...this.#m_selectedIndexes];
	}

	/** Adds a valid index from the associated model to the selection. */
	select(index: CModelIndex): void {
		if (!index.isValid() || index.model() !== this.#m_model
			|| this.isSelected(index))
			return;

		this.#m_selectedIndexes.push(index);
		this.selectionChanged.emit([index], []);
	}

	/** Removes an index from the selection. */
	deselect(index: CModelIndex): void {
		const position = this.#m_selectedIndexes.findIndex(
			selected => selected.equals(index)
		);

		if (position < 0)
			return;

		const deselected = this.#m_selectedIndexes[position];
		this.#m_selectedIndexes.splice(position, 1);
        if (deselected !== undefined)
		    this.selectionChanged.emit([], [deselected]);
	}

	/** Clears all selected indexes while preserving the current index. */
	clearSelection(): void {
		if (this.#m_selectedIndexes.length === 0)
			return;

		const deselected = [...this.#m_selectedIndexes];
		this.#m_selectedIndexes = [];
		this.selectionChanged.emit([], deselected);
	}

	/** Clears both the selection and the current index. */
	clear(): void {
		this.clearSelection();
		this.setCurrentIndex(new CModelIndex());
	}
}