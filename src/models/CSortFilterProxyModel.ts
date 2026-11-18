import { COrientation } from "../gui/COrientation.js";
import { CSortOrder } from "../gui/CSortOrder.js";
import { CAbstractItemModel } from "./CAbstractItemModel.js";
import { CAbstractProxyModel } from "./CAbstractProxyModel.js";
import { CModelIndex } from "./CModelIndex.js";

/** Provides sorting and text filtering for flat item models. */
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

	/**
	 * Counts the root rows that passed the current filter.
	 * @param parent Parent index. Omit it for the root.
	 * @returns Number of mapped rows at the root, or zero for a valid parent.
	 */
	override rowCount(parent = new CModelIndex()): number {
		return parent.isValid() ? 0 : this.#m_sourceRows.length;
	}

	/**
	 * Counts the source columns visible at the proxy root.
	 * @param parent Parent index. Omit it for the root.
	 * @returns Source column count, or zero when detached or given a valid parent.
	 */
	override columnCount(parent = new CModelIndex()): number {
		return parent.isValid()
			? 0
			: this.sourceModel()?.columnCount() ?? 0;
	}

	/**
	 * Uses the row mapping to resolve the source cell while retaining the column.
	 * @param proxyIndex Index owned by this proxy.
	 * @returns Source index, or an invalid index when the cell cannot be mapped.
	 */
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

	/**
	 * Maps a source index to its proxy-model index.
	 * @param sourceIndex Source index.
	 * @returns The map from source.
	 */
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
	 * Reads the literal text used for substring filtering.
	 * @returns Current filter text. An empty string disables filtering.
	 */
	filterFixedString(): string {
		return this.#m_filterFixedString;
	}

	/**
	 * Changes the literal substring and rebuilds the mapping if it differs.
	 * @param value Substring to match. Use an empty string to accept every source row.
	 */
	setFilterFixedString(value: string): void {
		if (this.#m_filterFixedString === value)
			return;

		this.#m_filterFixedString = value;
		this.invalidate();
	}

	/**
	 * Reads which source column the filter examines.
	 * @returns Zero-based source column, or `-1` to search every column.
	 */
	filterKeyColumn(): number {
		return this.#m_filterKeyColumn;
	}

	/**
	 * Changes the search column and rebuilds the mapping if it differs. Values below `-1` are ignored.
	 * @param column Zero-based source column, or `-1` to search all columns.
	 */
	setFilterKeyColumn(column: number): void {
		if (column < -1 || this.#m_filterKeyColumn === column)
			return;

		this.#m_filterKeyColumn = column;
		this.invalidate();
	}

	/**
	 * Reads whether filtering preserves letter case when matching text.
	 * @returns Whether matching is case-sensitive.
	 */
	isFilterCaseSensitive(): boolean {
		return this.#m_filterCaseSensitive;
	}

	/**
	 * Changes case handling for substring filtering and rebuilds the mapping if it differs.
	 * @param caseSensitive Whether matches must preserve letter case.
	 */
	setFilterCaseSensitive(caseSensitive: boolean): void {
		if (this.#m_filterCaseSensitive === caseSensitive)
			return;

		this.#m_filterCaseSensitive = caseSensitive;
		this.invalidate();
	}

	/**
	 * Reads whether text comparisons preserve case.
	 * @returns Whether text sorting is case-sensitive.
	 */
	isSortCaseSensitive(): boolean {
		return this.#m_sortCaseSensitive;
	}

	/**
	 * Changes case handling for text sorting and rebuilds the mapping if it differs.
	 * @param caseSensitive Whether text comparisons should preserve case.
	 */
	setSortCaseSensitive(caseSensitive: boolean): void {
		if (this.#m_sortCaseSensitive === caseSensitive)
			return;

		this.#m_sortCaseSensitive = caseSensitive;
		this.invalidate();
	}

	/**
	 * Reads the column used for proxy ordering.
	 * @returns Zero-based column, or `-1` to retain source order.
	 */
	sortColumn(): number {
		return this.#m_sortColumn;
	}

	/**
	 * Reads the stored ordering direction.
	 * @returns The configured ascending or descending order.
	 */
	sortOrder(): CSortOrder {
		return this.#m_sortOrder;
	}

	/**
	 * Reorders proxy rows without rearranging the source. Columns outside the valid range are ignored, except `-1` restores source order.
	 * @param column Zero-based sort column, or `-1` to clear sorting.
	 * @param order Requested direction. Defaults to ascending.
	 */
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

	/**
	 * Checks whether source data edits rebuild the row mapping automatically.
	 * @returns Whether automatic rebuilding on data changes is enabled.
	 */
	dynamicSortFilter(): boolean {
		return this.#m_dynamicSortFilter;
	}

	/**
	 * Controls whether source data changes rebuild the mapping. Enabling the option also rebuilds immediately.
	 * @param enabled Whether to enable dynamic sorting and filtering.
	 */
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

	/**
	 * Tests eligible source cells for the configured literal substring, converting cell values to text.
	 * @param sourceRow Zero-based source row to test.
	 * @returns Whether the row passes the filter. An empty filter accepts all rows when a source exists.
	 */
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

	/**
	 * Compares two source values for sorting. Numbers, dates and booleans of the same kind have specialized ordering. Other values are compared as text.
	 * @param left Left source index.
	 * @param right Right source index.
	 * @returns Whether the left value sorts before the right value.
	 */
	protected lessThan(left: CModelIndex, right: CModelIndex): boolean {
		const source = this.sourceModel();

		if (source === null)
			return false;

		return this.#compareValues(
			source.data(left),
			source.data(right)
		) < 0;
	}

	/**
	 * Rebuilds the mapping for the newly attached source before the proxy reset.
	 * @param _oldSourceModel Previously attached model, or `null`.
	 * @param _newSourceModel Newly attached model, or `null`.
	 */
	protected override sourceModelChanged(
		_oldSourceModel: CAbstractItemModel | null,
		_newSourceModel: CAbstractItemModel | null
	): void {
		this.#rebuildMapping();
	}

	/**
	 * Rebuilds the mapping in dynamic mode. Otherwise, forwards the change through the existing mapping.
	 * @param topLeft Upper-left source index in the change range.
	 * @param bottomRight Lower-right source index in the change range.
	 */
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

	/** Rebuilds the mapping and emits a proxy reset. */
	protected override sourceModelReset(): void {
		this.#rebuildMapping();
		super.sourceModelReset();
	}

	/** Rebuilds the mapping and emits a proxy reset after source indexes are rearranged. */
	protected override sourceLayoutChanged(): void {
		this.#rebuildMapping();
		super.sourceLayoutChanged();
	}

	/**
	 * Reads a source header, translating vertical sections through the proxy row mapping.
	 * @param section Zero-based proxy header section.
	 * @param orientation Horizontal for columns or vertical for rows.
	 * @returns The source header value, or `null` when the source or mapped row is unavailable.
	 */
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
