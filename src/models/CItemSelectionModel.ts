import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CModelIndex } from "./CModelIndex.js";

type SelectionRectangle = {
    firstRow: number;
    lastRow: number;
    firstColumn: number;
    lastColumn: number;
};

function cellKey(index: CModelIndex): string {
    return `${index.row()}:${index.column()}`;
}

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
    #rectangle: SelectionRectangle | null = null;
    #excludedCells = new Set<string>();

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
		if (this.#m_selectedIndexes.length > 0) return true;
        const rect = this.#rectangle;
        return rect !== null &&
            (rect.lastRow - rect.firstRow + 1) * (rect.lastColumn - rect.firstColumn + 1) > this.#excludedCells.size;
	}

	/** Returns whether the specified index is selected. */
	isSelected(index: CModelIndex): boolean {
        if (!index.isValid() || index.model() !== this.#m_model) return false;
        if (this.#inRectangle(index)) return !this.#excludedCells.has(cellKey(index));
		return this.#m_selectedIndexes.some(selected => selected.equals(index));
	}

	/** Returns a copy of the selected indexes. */
	selectedIndexes(): CModelIndex[] {
        return this.#collectIndexes(false);
    }

    /** @internal Includes former coordinates when a removal has already shortened the model. */
    indexesForRowChange(): CModelIndex[] {
        return this.#collectIndexes(true);
    }

    #collectIndexes(includeFormerCoordinates: boolean): CModelIndex[] {
        const indexes: CModelIndex[] = [];
        const rect = this.#rectangle;
        if (rect !== null) {
            for (let row = rect.firstRow; row <= rect.lastRow; ++row) {
                for (let column = rect.firstColumn; column <= rect.lastColumn; ++column) {
                    if (this.#excludedCells.has(`${row}:${column}`)) continue;
                    const index = this.#m_model.index(row, column);
                    if (index.isValid()) indexes.push(index);
                    else if (includeFormerCoordinates)
                        indexes.push(new CModelIndex(row, column, null, this.#m_model));
                }
            }
        }
        return indexes.concat(this.#m_selectedIndexes);
	}

	/** Adds a valid index from the associated model to the selection. */
	select(index: CModelIndex): void {
		if (!index.isValid() || index.model() !== this.#m_model
			|| this.isSelected(index))
			return;

        if (this.#inRectangle(index)) this.#excludedCells.delete(cellKey(index));
        else this.#m_selectedIndexes.push(index);
		this.selectionChanged.emit([index], []);
	}

    /** @internal Replaces the selection with a rectangle in a flat model. */
    selectRectangle(anchor: CModelIndex, end: CModelIndex): void {
        if (!anchor.isValid() || !end.isValid() ||
            anchor.model() !== this.#m_model || end.model() !== this.#m_model) return;

        const previous = this.selectionChanged.hasConnections() ? this.selectedIndexes() : null;
        this.#rectangle = {
            firstRow: Math.min(anchor.row(), end.row()),
            lastRow: Math.max(anchor.row(), end.row()),
            firstColumn: Math.min(anchor.column(), end.column()),
            lastColumn: Math.max(anchor.column(), end.column())
        };
        this.#excludedCells.clear();
        this.#m_selectedIndexes = [];

        // Existing subscribers receive concrete index deltas.
        if (previous !== null) {
            const oldCells = new Set(previous.map(cellKey));
            const added = this.selectedIndexes().filter(index => !oldCells.has(cellKey(index)));
            const removed = previous.filter(index => !this.isSelected(index));
            if (added.length > 0 || removed.length > 0) this.selectionChanged.emit(added, removed);
        }
    }

    #inRectangle(index: CModelIndex): boolean {
        const rect = this.#rectangle;
        return rect !== null &&
            index.row() >= rect.firstRow && index.row() <= rect.lastRow &&
            index.column() >= rect.firstColumn && index.column() <= rect.lastColumn;
    }

	/** Removes an index from the selection. */
	deselect(index: CModelIndex): void {
        if (index.isValid() && index.model() === this.#m_model && this.#inRectangle(index)) {
            const key = cellKey(index);
            if (!this.#excludedCells.has(key)) {
                this.#excludedCells.add(key);
                this.selectionChanged.emit([], [index]);
            }
            return;
        }
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
        const deselected = this.selectionChanged.hasConnections() ? this.selectedIndexes() : [];
        this.#rectangle = null;
        this.#excludedCells.clear();
        this.#m_selectedIndexes = [];
        if (deselected.length > 0) this.selectionChanged.emit([], deselected);
	}

	/** Clears both the selection and the current index. */
	clear(): void {
		this.clearSelection();
		this.setCurrentIndex(new CModelIndex());
	}

	/** Remaps current and selected indexes after a model layout change. */
	remapIndexes(
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): void {
		if (oldIndexes.length !== newIndexes.length)
			return;

		this.#m_currentIndex = this.#remapIndex(
			this.#m_currentIndex,
			oldIndexes,
			newIndexes
		);

        if (this.#rectangle !== null) {
            // A layout change can scatter a rectangle across unrelated rows.
            const mappedCells = new Map(oldIndexes.map((index, i) => [cellKey(index), newIndexes[i]!]));
            const remapped: CModelIndex[] = [];
            const seen = new Set<string>();
            for (const index of this.indexesForRowChange()) {
                const mapped = mappedCells.get(cellKey(index)) ?? index;
                const key = cellKey(mapped);
                if (!mapped.isValid() || mapped.model() !== this.#m_model ||
                    mapped.row() >= this.#m_model.rowCount() || seen.has(key)) continue;
                seen.add(key);
                remapped.push(mapped);
            }
            this.#rectangle = null;
            this.#excludedCells.clear();
            this.#m_selectedIndexes = remapped;
            return;
        }

		const remapped: CModelIndex[] = [];

		for (const index of this.#m_selectedIndexes) {
			const mapped = this.#remapIndex(
				index,
				oldIndexes,
				newIndexes
			);

			if (mapped.isValid() && mapped.model() === this.#m_model &&
				!remapped.some(existing => existing.equals(mapped)))
				remapped.push(mapped);
		}

		this.#m_selectedIndexes = remapped;
	}

	#remapIndex(
		index: CModelIndex,
		oldIndexes: CModelIndex[],
		newIndexes: CModelIndex[]
	): CModelIndex {
		if (!index.isValid())
			return index;

		const position = oldIndexes.findIndex(old => old.equals(index));

		if (position < 0)
			return index;

		const mapped = newIndexes[position];

		if (mapped === undefined ||
			(mapped.isValid() && mapped.model() !== this.#m_model))
			return new CModelIndex();

		return mapped;
	}
}
