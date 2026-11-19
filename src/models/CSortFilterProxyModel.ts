/** @module Models/CSortFilterProxyModel */
import { COrientation } from "../gui/COrientation.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CAbstractProxyModel } from "./CAbstractProxyModel.js";
import { CModelIndex } from "./CModelIndex.js";

/** Provides sorting and text filtering for flat item models.
 *
 * @example
 * ```ts
 * const proxy = new CSortFilterProxyModel();
 * proxy.setSourceModel(sourceModel);
 * proxy.setFilterKeyColumn(1);
 * proxy.setFilterFixedString("London");
 * proxy.sort(0, CSortOrder.AscendingOrder);
 * view.setModel(proxy);
 * ```
 */
export class CSortFilterProxyModel extends CAbstractProxyModel {
	#m_sourceRows: number[] = [];
	#m_proxyRows = new Map<number, number>();
	#m_filterFixedString = "";
	#m_filterKeyColumn = -1;
	#m_filterCaseSensitive = false;
	#m_sortCaseSensitive = false;
	#m_sortColumn = -1;
	#m_sortOrder = CSortOrder.AscendingOrder;
	#m_dynamicSortFilter = true;

	override rowCount(parent = new CModelIndex()): number {
		return parent.isValid() ? 0 : this.#m_sourceRows.length;
	}

	override columnCount(parent = new CModelIndex()): number {
		return parent.isValid()
			? 0
			: this.sourceModel()?.columnCount() ?? 0;
	}

    /** Maps a proxy index to its source-model index. */
    override mapToSource(proxyIndex: CModelIndex): CModelIndex {
		const source = this.sourceModel();

		if (source === null || !proxyIndex.isValid() ||
			proxyIndex.model() !== this)
			return new CModelIndex();

		const sourceRow = this.#m_sourceRows[proxyIndex.row()];

		return sourceRow === undefined
			? new CModelIndex()
			: source.index(sourceRow, proxyIndex.column());
	}

    /** Maps a source index to its proxy-model index. */
    override mapFromSource(sourceIndex: CModelIndex): CModelIndex {
		if (!sourceIndex.isValid() ||
			sourceIndex.model() !== this.sourceModel())
			return new CModelIndex();

		const proxyRow = this.#m_proxyRows.get(sourceIndex.row());

		return proxyRow === undefined
			? new CModelIndex()
			: this.index(proxyRow, sourceIndex.column());
	}

    /**
    * Literal text used to accept or reject source rows.
    * The initial value is `""`.
    */
    filterFixedString(): string {
		return this.#m_filterFixedString;
	}

    /** Sets the fixed string used for filtering. */
    setFilterFixedString(value: string): void {
		if (this.#m_filterFixedString === value)
			return;

		this.#m_filterFixedString = value;
		this.invalidate();
	}

    /**
    * Source column searched by the filter; -1 searches all columns.
    * The initial value is `-1`.
    */
    filterKeyColumn(): number {
		return this.#m_filterKeyColumn;
	}

    /** Sets the filtered column, or `-1` for all columns. */
    setFilterKeyColumn(column: number): void {
		if (column < -1 || this.#m_filterKeyColumn === column)
			return;

		this.#m_filterKeyColumn = column;
		this.invalidate();
	}

    /** Returns whether fixed-string filtering is case-sensitive. */
    isFilterCaseSensitive(): boolean {
		return this.#m_filterCaseSensitive;
	}

    /** Sets whether fixed-string filtering is case-sensitive. */
    setFilterCaseSensitive(caseSensitive: boolean): void {
		if (this.#m_filterCaseSensitive === caseSensitive)
			return;

		this.#m_filterCaseSensitive = caseSensitive;
		this.invalidate();
	}

    /** Returns whether text sorting is case-sensitive. */
    isSortCaseSensitive(): boolean {
		return this.#m_sortCaseSensitive;
	}

    /** Sets whether text sorting is case-sensitive. */
    setSortCaseSensitive(caseSensitive: boolean): void {
		if (this.#m_sortCaseSensitive === caseSensitive)
			return;

		this.#m_sortCaseSensitive = caseSensitive;
		this.invalidate();
	}

    /**
    * Model column currently used for ordering.
    * The initial value is `-1`.
    */
    sortColumn(): number {
		return this.#m_sortColumn;
	}

    /**
    * Ascending or descending sort direction.
    * The initial value is `CSortOrder.AscendingOrder`.
    */
    sortOrder(): CSortOrder {
		return this.#m_sortOrder;
	}

    /** Sorts proxy rows without changing the source model. */
    override sort(
		column: number,
		order: CSortOrder = CSortOrder.AscendingOrder
	): void {
		if (column < -1 || column >= this.columnCount())
			return;

		if (this.#m_sortColumn === column && this.#m_sortOrder === order)
			return;

		this.#m_sortColumn = column;
		this.#m_sortOrder = order;
		this.invalidate();
	}

    /** Returns whether source data changes automatically rebuild the proxy. */
    dynamicSortFilter(): boolean {
		return this.#m_dynamicSortFilter;
	}

    /** Sets whether source data changes automatically rebuild the proxy. */
    setDynamicSortFilter(enabled: boolean): void {
		if (this.#m_dynamicSortFilter === enabled)
			return;

		this.#m_dynamicSortFilter = enabled;

		if (enabled)
			this.invalidate();
	}

    /** Rebuilds the row mapping and resets the proxy. */
    invalidate(): void {
		const oldRows = [...this.#m_sourceRows];
		const columnCount = this.columnCount();
		const oldIndexes: CModelIndex[] = [];
		const sourceCoordinates: Array<[number, number]> = [];

		for (let row = 0; row < oldRows.length; row++) {
			const sourceRow = oldRows[row];

			if (sourceRow === undefined)
				continue;

			for (let column = 0; column < columnCount; column++) {
				oldIndexes.push(this.index(row, column));
				sourceCoordinates.push([sourceRow, column]);
			}
		}

		this.beginLayoutChange();
		this.#rebuildMapping();

		const newIndexes = sourceCoordinates.map(([sourceRow, column]) => {
			const proxyRow = this.#m_proxyRows.get(sourceRow);

			return proxyRow === undefined
				? new CModelIndex()
				: this.index(proxyRow, column);
		});

		this.endLayoutChange(oldIndexes, newIndexes);
	}

    /** Returns whether a source row passes the current filter. */
    protected filterAcceptsRow(sourceRow: number): boolean {
		const source = this.sourceModel();

		if (source === null || this.#m_filterFixedString.length === 0)
			return source !== null;

		const needle = this.#m_filterCaseSensitive
			? this.#m_filterFixedString
			: this.#m_filterFixedString.toLocaleLowerCase();
		const firstColumn = this.#m_filterKeyColumn < 0
			? 0
			: this.#m_filterKeyColumn;
		const lastColumn = this.#m_filterKeyColumn < 0
			? source.columnCount() - 1
			: this.#m_filterKeyColumn;

		for (let column = firstColumn; column <= lastColumn; column++) {
			const index = source.index(sourceRow, column);

			if (!index.isValid())
				continue;

			const text = String(source.data(index) ?? "");
			const haystack = this.#m_filterCaseSensitive
				? text
				: text.toLocaleLowerCase();

			if (haystack.includes(needle))
				return true;
		}

		return false;
	}

    /** Returns whether the left source index sorts before the right one. */
    protected lessThan(left: CModelIndex, right: CModelIndex): boolean {
		const source = this.sourceModel();

		if (source === null)
			return false;

		return this.#compareValues(
			source.data(left),
			source.data(right)
		) < 0;
	}

    /** Rebuilds the mapping after the source model changes. */
    protected override sourceModelChanged(
		_oldSourceModel: CAbstractItemModel | null,
		_newSourceModel: CAbstractItemModel | null
	): void {
		this.#rebuildMapping();
	}

    /** Updates filtering and sorting after source data changes. */
    protected override sourceDataChanged(
		topLeft: CModelIndex,
		bottomRight: CModelIndex
	): void {
		if (this.#m_dynamicSortFilter) {
			this.invalidate();
			return;
		}

		super.sourceDataChanged(topLeft, bottomRight);
	}

    /** Rebuilds the mapping after a source reset. */
    protected override sourceModelReset(): void {
		this.#rebuildMapping();
		super.sourceModelReset();
	}

    /** Rebuilds the mapping after a source layout change. */
    protected override sourceLayoutChanged(): void {
		this.#rebuildMapping();
		super.sourceLayoutChanged();
	}

    /** Maps vertical headers to their source rows. */
    override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		const source = this.sourceModel();

		if (source === null)
			return null;

		if (orientation === COrientation.Horizontal)
			return source.headerData(section, orientation);

		const sourceRow = this.#m_sourceRows[section];
		return sourceRow === undefined
			? null
			: source.headerData(sourceRow, orientation);
	}

	#rebuildMapping(): void {
		const source = this.sourceModel();
		this.#m_sourceRows = [];
		this.#m_proxyRows.clear();

		if (source === null)
			return;

		for (let row = 0; row < source.rowCount(); row++) {
			if (this.filterAcceptsRow(row))
				this.#m_sourceRows.push(row);
		}

		if (this.#m_sortColumn >= 0) {
			const column = this.#m_sortColumn;
			const direction = this.#m_sortOrder === CSortOrder.AscendingOrder
				? 1
				: -1;

			if (this.lessThan === CSortFilterProxyModel.prototype.lessThan) {
				this.#sortCachedKeys(source, column, direction);
			} else {
				this.#sortWithCustomComparator(source, column, direction);
			}
		}

		this.#m_sourceRows.forEach((sourceRow, proxyRow) => this.#m_proxyRows.set(sourceRow, proxyRow));
	}

	#sortCachedKeys(source: CAbstractItemModel, column: number, direction: number): void {
		const keys = this.#m_sourceRows.map(row => ({ row, value: source.data(source.index(row, column)) }));
		keys.sort((left, right) => {
			if (left.value === null || left.value === undefined)
				return right.value === null || right.value === undefined ? left.row - right.row : 1;
			if (right.value === null || right.value === undefined) return -1;

			if (this.#compareValues(left.value, right.value) < 0) return -direction;
			if (this.#compareValues(right.value, left.value) < 0) return direction;
			return left.row - right.row;
		});
		this.#m_sourceRows = keys.map(key => key.row);
	}

	#sortWithCustomComparator(source: CAbstractItemModel, column: number, direction: number): void {
		this.#m_sourceRows.sort((leftRow, rightRow) => {
			const left = source.index(leftRow, column);
			const right = source.index(rightRow, column);
			const leftValue = source.data(left);
			const rightValue = source.data(right);
			const leftEmpty = leftValue === null || leftValue === undefined;
			const rightEmpty = rightValue === null || rightValue === undefined;

			if (leftEmpty && rightEmpty)
				return leftRow - rightRow;
			if (leftEmpty)
				return 1;
			if (rightEmpty)
				return -1;

			if (this.lessThan(left, right))
				return -1 * direction;
			if (this.lessThan(right, left))
				return 1 * direction;

			return leftRow - rightRow;
		});
	}

	#compareValues(left: unknown, right: unknown): number {
		if (Object.is(left, right))
			return 0;

		if (typeof left === "number" && typeof right === "number") {
			if (Number.isNaN(left))
				return Number.isNaN(right) ? 0 : 1;
			if (Number.isNaN(right))
				return -1;
			return left < right ? -1 : 1;
		}

		if (left instanceof Date && right instanceof Date) {
			const leftTime = left.getTime();
			const rightTime = right.getTime();
			return leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;
		}

		if (typeof left === "boolean" && typeof right === "boolean")
			return left === right ? 0 : left ? 1 : -1;

		const leftText = String(left);
		const rightText = String(right);

		return this.#m_sortCaseSensitive
			? leftText.localeCompare(rightText)
			: leftText.toLocaleLowerCase().localeCompare(
				rightText.toLocaleLowerCase()
			);
	}
}
