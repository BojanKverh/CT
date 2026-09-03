import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

export class CItemSelectionModel extends CObject {
	readonly currentChanged =
		new CSignal<[CModelIndex, CModelIndex]>();

	readonly selectionChanged =
		new CSignal<[CModelIndex[], CModelIndex[]]>();

	#m_model: CAbstractItemModel;
	#m_currentIndex = new CModelIndex();
	#m_selectedIndexes: CModelIndex[] = [];

	constructor(model: CAbstractItemModel, parent: CObject | null = null) {
		super(parent);
		this.#m_model = model;
	}

	model(): CAbstractItemModel {
		return this.#m_model;
	}

	currentIndex(): CModelIndex {
		return this.#m_currentIndex;
	}

	setCurrentIndex(index: CModelIndex): void {
		if (this.#m_currentIndex.equals(index))
			return;

		const previous = this.#m_currentIndex;
		this.#m_currentIndex = index;
		this.currentChanged.emit(index, previous);
	}

	hasSelection(): boolean {
		return this.#m_selectedIndexes.length > 0;
	}

	isSelected(index: CModelIndex): boolean {
		return this.#m_selectedIndexes.some(
			selected => selected.equals(index)
		);
	}

	selectedIndexes(): CModelIndex[] {
		return [...this.#m_selectedIndexes];
	}

	select(index: CModelIndex): void {
		if (!index.isValid() || this.isSelected(index))
			return;

		this.#m_selectedIndexes.push(index);
		this.selectionChanged.emit([index], []);
	}

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

	clearSelection(): void {
		if (this.#m_selectedIndexes.length === 0)
			return;

		const deselected = [...this.#m_selectedIndexes];
		this.#m_selectedIndexes = [];
		this.selectionChanged.emit([], deselected);
	}

	clear(): void {
		this.clearSelection();
		this.setCurrentIndex(new CModelIndex());
	}
}