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

	/**
	 * Identifies the item model whose selection is tracked.
	 * @returns The associated model.
	 */
	model(): CAbstractItemModel {
		return this.#m_model;
	}

	/**
	 * Reads the current item independently of the selection.
	 * @returns The current index, which may be invalid.
	 */
	currentIndex(): CModelIndex {
		return this.#m_currentIndex;
	}

	/**
	 * Changes the current index and emits `currentChanged` when it differs. A valid index owned by another model is ignored.
	 * @param index Index in the associated model, or an invalid index to clear the current item.
	 */
	setCurrentIndex(index: CModelIndex): void {
		if (index.isValid() && index.model() !== this.#m_model)
			return;

		if (this.#m_currentIndex.equals(index))
			return;

		const previous = this.#m_currentIndex;
		this.#m_currentIndex = index;
		this.currentChanged.emit(index, previous);
	}

	/**
	 * Returns whether at least one index is selected.
	 * @returns `true` if the item selection model has selection, otherwise `false`.
	 */
	hasSelection(): boolean {
		if (this.#m_selectedIndexes.length > 0) return true;
        const rect = this.#rectangle;
        return rect !== null &&
            (rect.lastRow - rect.firstRow + 1) * (rect.lastColumn - rect.firstColumn + 1) > this.#excludedCells.size;
	}

	/**
	 * Checks the explicit selection and any rectangular selection, including exclusions for individually deselected cells.
	 * @param index Index owned by the associated model.
	 * @returns `true` if the index is selected.
	 */
	isSelected(index: CModelIndex): boolean {
        if (!index.isValid() || index.model() !== this.#m_model) return false;
        if (this.#inRectangle(index)) return !this.#excludedCells.has(cellKey(index));
		return this.#m_selectedIndexes.some(selected => selected.equals(index));
	}

	/**
	 * Expands any selected rectangle, omits excluded cells and appends individually selected indexes.
	 * @returns A fresh array of currently selected indexes.
	 */
	selectedIndexes(): CModelIndex[] {
        return this.#collectIndexes(false);
    }

    /**
     * Captures selected indexes for remapping after rows change, preserving former rectangle coordinates that no longer resolve.
     * @returns Selected indexes, including former coordinates needed by the row-change handler.
     * @internal
     */
    indexesForRowChange(): CModelIndex[] {
        return this.#collectIndexes(true);
    }

    #collectIndexes(includeFormerCoordinates: boolean): CModelIndex[] {
        return [...this.#rectangleIndexes(includeFormerCoordinates), ...this.#m_selectedIndexes];
    }

    *#rectangleIndexes(includeFormerCoordinates = false): IterableIterator<CModelIndex> {
        const rect = this.#rectangle;
        if (rect === null) return;
        for (let row = rect.firstRow; row <= rect.lastRow; ++row) {
            for (let column = rect.firstColumn; column <= rect.lastColumn; ++column) {
                if (this.#excludedCells.size > 0 && this.#excludedCells.has(`${row}:${column}`)) continue;
                const index = this.#m_model.index(row, column);
                if (index.isValid()) yield index;
                else if (includeFormerCoordinates)
                    yield new CModelIndex(row, column, null, this.#m_model);
            }
        }
    }

    /**
     * Iterates rectangular and explicitly selected cells in row order, then column order within each row.
     * @returns Iterator over the selected model indexes.
     * @internal
     */
    *selectedIndexesInRowOrder(): IterableIterator<CModelIndex> {
        const compare = (left: CModelIndex, right: CModelIndex) =>
            left.row() - right.row() || left.column() - right.column();
        const extras = [...this.#m_selectedIndexes].sort(compare);
        let extra = 0;
        for (const index of this.#rectangleIndexes()) {
            while (extra < extras.length && compare(extras[extra]!, index) < 0)
                yield extras[extra++]!;
            yield index;
        }
        while (extra < extras.length) yield extras[extra++]!;
    }

	/**
	 * Adds a valid index to the selection or removes its exclusion from the selected rectangle, then emits `selectionChanged`.
	 * @param index Index owned by the associated model. Invalid, foreign and already selected indexes are ignored.
	 */
	select(index: CModelIndex): void {
		if (!index.isValid() || index.model() !== this.#m_model
			|| this.isSelected(index))
			return;

        if (this.#inRectangle(index)) this.#excludedCells.delete(cellKey(index));
        else this.#m_selectedIndexes.push(index);
		this.selectionChanged.emit([index], []);
	}

    /**
     * Replaces the selection with the inclusive rectangle between two cells and clears previous exclusions. Emits a delta to listeners when the selected cells change.
     * @param anchor First corner index owned by the associated flat model.
     * @param end Opposite corner index owned by the same model.
     * @internal
     */
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

	/**
	 * Removes an explicitly selected index or excludes a cell from the selected rectangle and emits `selectionChanged` on a change.
	 * @param index Index to deselect.
	 */
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

	/** Clears the selection and resets the current index to an invalid index. */
	clear(): void {
		this.clearSelection();
		this.setCurrentIndex(new CModelIndex());
	}

	/**
	 * Remaps current and selected indexes after model layout changes without emitting selection signals. A rectangle becomes a list of remapped cells. Unequal input lengths are ignored.
	 * @param oldIndexes Indexes before the rearrangement.
	 * @param newIndexes Corresponding indexes after it. Invalid indexes represent removed items.
	 */
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
