import { CAlignment } from "../core/CAlignment.js";
import { CSpacerItem } from "./CSpacerItem.js";
import type { CLayoutItem } from "./CLayoutItem.js";
import { CSizePolicy } from "../geometry/CSizePolicy.js";
import { CLayout } from "./CLayout.js";
import { CGridLayoutItem } from "./CGridLayoutItem.js";
import { CSize } from "../geometry/CSize.js";
import type { CWidget } from "../widgets/CWidget.js";

/**
 * Layout that arranges widgets in a row-and-column grid.
 *
 * Widgets may span multiple cells, and rows and columns may be assigned
 * independent stretch factors.
 */
export class CGridLayout extends CLayout
{
	#m_spacerPositions = new Map<CLayoutItem, { row(): number; column(): number; rowSpan(): number; columnSpan(): number }>();
	#m_rowStretch = new Map<number, number>();
	#m_columnStretch = new Map<number, number>();

	/**
	 * Appends a widget in column zero of a new row.
	 * @param widget Widget to add.
	 */
	override addWidget(widget: CWidget): void;
	/**
	 * Places a widget at a grid location, optionally spanning several cells.
	 * @param widget Widget to add.
	 * @param row Zero-based starting row.
	 * @param column Zero-based starting column.
	 * @param rowSpan Number of rows to occupy. Defaults to one.
	 * @param columnSpan Number of columns to occupy. Defaults to one.
	 * @param alignment Alignment flags within the allocated cells. Defaults to zero.
	 */
	override addWidget(widget: CWidget, row: number, column: number,
		rowSpan?: number, columnSpan?: number, alignment?: CAlignment | 0): void;

	/**
	 * Places a widget explicitly or appends it to a new row when either coordinate is omitted. Negative indices and spans below one are ignored.
	 * @param widget Widget to add.
	 * @param row Optional zero-based starting row.
	 * @param column Optional zero-based starting column.
	 * @param rowSpan Number of rows to occupy. Defaults to one.
	 * @param columnSpan Number of columns to occupy. Defaults to one.
	 * @param alignment Alignment flags within the allocated cells. Defaults to zero.
	 */
	override addWidget(widget: CWidget, row?: number, column?: number,
		rowSpan = 1, columnSpan = 1, alignment: CAlignment | 0 = 0): void
	{
		if (row === undefined || column === undefined) {
			row = this.rowCount();
			column = 0;
		}

		if (row < 0 || column < 0)
			return;

		if (rowSpan < 1 || columnSpan < 1)
			return;

		const item = new CGridLayoutItem(widget, row, column, rowSpan, columnSpan);
        item.setAlignment(alignment);
        this.addItem(item);
	}

    /**
     * Adds an empty item at a grid location. Invalid coordinates or spans and duplicate spacers are ignored.
     * @param spacer Spacer item to add.
     * @param row Nonnegative safe integer starting row.
     * @param column Nonnegative safe integer starting column.
     * @param rowSpan Positive safe integer row span. Defaults to one.
     * @param columnSpan Positive safe integer column span. Defaults to one.
     */
    addSpacerItem(spacer: CSpacerItem, row: number, column: number, rowSpan = 1, columnSpan = 1): void {
        if (![row, column, rowSpan, columnSpan].every(Number.isSafeInteger)
            || row < 0 || column < 0 || rowSpan < 1 || columnSpan < 1 || this.items().includes(spacer)) return;
        this.#m_spacerPositions.set(spacer, { row: () => row, column: () => column,
            rowSpan: () => rowSpan, columnSpan: () => columnSpan });
        this.addItem(spacer);
    }

    /** Clears all items and spacer positions. Existing row and column stretch settings are retained. */
    override clear(): void { this.#m_spacerPositions.clear(); super.clear(); }

    #position(item: CLayoutItem) {
        return this.#m_spacerPositions.get(item) ?? item as CGridLayoutItem;
    }

	/**
	 * Measures the grid's occupied vertical extent, including spans and gaps.
	 * @returns One past the greatest occupied row, or zero for an empty grid.
	 */
	rowCount(): number {
		let count = 0;

		for (const item of this.items()) {
			const gridItem = this.#position(item);

			count = Math.max(count, gridItem.row() + gridItem.rowSpan());
		}

		return count;
	}

	/**
	 * Measures the grid's occupied horizontal extent, including spans and gaps.
	 * @returns One past the greatest occupied column, or zero for an empty grid.
	 */
	columnCount(): number {
		let count = 0;

		for (const item of this.items()) {
			const gridItem = this.#position(item);

			count = Math.max(count, gridItem.column() + gridItem.columnSpan());
		}

		return count;
	}

	/**
	 * Sets a row's growth weight and updates geometry. Negative arguments are ignored.
	 * @param row Zero-based row index.
	 * @param stretch Nonnegative stretch weight. Zero clears the custom setting.
	 */
	setRowStretch(row: number, stretch: number): void {
		if (row < 0 || stretch < 0)
			return;

		if (stretch === 0)
			this.#m_rowStretch.delete(row);
		else
			this.#m_rowStretch.set(row, stretch);

		this.update();
	}

	/**
	 * Sets a column's growth weight and updates geometry. Negative arguments are ignored.
	 * @param column Zero-based column index.
	 * @param stretch Nonnegative stretch weight. Zero clears the custom setting.
	 */
	setColumnStretch(column: number, stretch: number): void {
		if (column < 0 || stretch < 0)
			return;

		if (stretch === 0)
			this.#m_columnStretch.delete(column);
		else
			this.#m_columnStretch.set(column, stretch);

		this.update();
	}

	/**
	 * Looks up the growth weight configured for a row.
	 * @param row Zero-based row index.
	 * @returns The configured stretch weight, or zero if unset.
	 */
	rowStretch(row: number): number {
		return this.#m_rowStretch.get(row) ?? 0;
	}

	/**
	 * Looks up the growth weight configured for a column.
	 * @param column Zero-based column index.
	 * @returns The configured stretch weight, or zero if unset.
	 */
	columnStretch(column: number): number {
		return this.#m_columnStretch.get(column) ?? 0;
	}

	/**
	 * Combines preferred row and column sizes with spacing and margins.
	 * @returns A new preferred grid size, or a zero size for an empty grid.
	 */
	override sizeHint(): CSize {
		const rows = this.rowCount();
		const columns = this.columnCount();

		if (rows === 0 || columns === 0)
			return new CSize();

		const rowSizes = this.#preferredRowSizes();
		const columnSizes = this.#preferredColumnSizes();

		const margins = this.contentsMargins();
		const spacing = this.spacing();

		const width =
			this.#sum(columnSizes)
			+ Math.max(0, columns - 1) * spacing
			+ margins.left
			+ margins.right;

		const height =
			this.#sum(rowSizes)
			+ Math.max(0, rows - 1) * spacing
			+ margins.top
			+ margins.bottom;

		return new CSize(width, height);
	}

    /**
     * Allocates column widths and measures preferred row heights at those widths.
     * @param width Available width including horizontal margins, in logical pixels.
     * @returns Preferred height including row spacing and margins, or `-1` when no widget has height-for-width.
     */
    override heightForWidth(width: number): number {
        if (!this.hasHeightForWidth()) return -1;
        const margins = this.contentsMargins();
        const widths = this.#calculateColumnSizes(Math.max(0, width - margins.left - margins.right
            - Math.max(0, this.columnCount() - 1) * this.spacing()));
        return this.#sum(this.#axisMetrics(false, widths).preferred)
            + Math.max(0, this.rowCount() - 1) * this.spacing() + margins.top + margins.bottom;
    }

	/** Allocates rows and columns in the parent widget's contents and applies aligned item geometry. With no parent, geometry is left as-is. */
	override update(): void {
		const parent = this.parentWidget();

		if (parent === null)
			return;

		const rows = this.rowCount();
		const columns = this.columnCount();

		if (rows === 0 || columns === 0)
			return;

		const contentsRect = parent.contentsRect();
		const margins = this.contentsMargins();
		const spacing = this.spacing();

		const contentX = contentsRect.x() + margins.left;
		const contentY = contentsRect.y() + margins.top;

		const contentWidth = Math.max(
			0,
			contentsRect.width()
				- margins.left
				- margins.right
		);

		const contentHeight = Math.max(
			0,
			contentsRect.height()
				- margins.top
				- margins.bottom
		);

		const availableWidth = Math.max(
			0,
			contentWidth
				- Math.max(0, columns - 1) * spacing
		);

		const availableHeight = Math.max(
			0,
			contentHeight
				- Math.max(0, rows - 1) * spacing
		);

		const columnSizes = this.#calculateColumnSizes(
			availableWidth
		);

		const rowSizes = this.#axisSizes(availableHeight, false, columnSizes);

		const columnPositions = this.#positions(
			contentX,
			columnSizes,
			spacing
		);

		const rowPositions = this.#positions(
			contentY,
			rowSizes,
			spacing
		);

		for (const item of this.items()) {
			const gridItem = this.#position(item);
			const width = this.#spanSize(
				columnSizes,
				gridItem.column(),
				gridItem.columnSpan(),
				spacing
			);

			const height = this.#spanSize(
				rowSizes,
				gridItem.row(),
				gridItem.rowSpan(),
				spacing
			);

            CLayout.setAlignedItemGeometry(item, columnPositions[gridItem.column()]!,
                rowPositions[gridItem.row()]!, width, height);
		}
	}

    #axisMetrics(horizontal: boolean, columnSizes?: number[]) {
        const count = horizontal ? this.columnCount() : this.rowCount();
        const minimums = new Array<number>(count).fill(0);
        const preferred = new Array<number>(count).fill(0);
        const maximums = new Array<number>(count).fill(0);
        const weights = new Array<number>(count).fill(0);
        const expanding = new Array<boolean>(count).fill(false);
        for (const entry of this.items()) {
            const item = this.#position(entry);
            const start = horizontal ? item.column() : item.row();
            const span = horizontal ? item.columnSpan() : item.rowSpan();
            const cellWidth = columnSizes === undefined ? undefined
                : this.#spanSize(columnSizes, item.column(), item.columnSpan(), this.spacing());
            const actualWidth = cellWidth === undefined ? undefined : CLayout.itemWidth(entry, cellWidth);
            const bounds = CLayout.layoutItemAxisBounds(entry, horizontal, actualWidth);
            const spacing = (span - 1) * this.spacing();
            this.#ensureSpanSize(minimums, start, span, Math.max(0, bounds.minimum - spacing));
            this.#ensureSpanSize(preferred, start, span, Math.max(0, bounds.preferred - spacing));
            const policy = entry.sizePolicy();
            const axis = horizontal ? policy.horizontalPolicy() : policy.verticalPolicy();
            const stretch = horizontal ? policy.horizontalStretch() : policy.verticalStretch();
            for (let i = start; i < start + span; ++i) {
                maximums[i] = Math.max(maximums[i]!, Math.max(0, (CLayout.itemAxisAlignment(entry, horizontal) ? Number.MAX_SAFE_INTEGER : bounds.maximum) - spacing) / span);
                weights[i] = Math.max(weights[i]!, stretch);
                expanding[i] ||= CSizePolicy.isExpanding(axis);
            }
        }
        const priorities = new Array<number>(count).fill(1);
        for (let i = 0; i < count; ++i) {
            preferred[i] = Math.max(preferred[i]!, minimums[i]!);
            maximums[i] = Math.max(maximums[i]!, preferred[i]!);
            const explicit = horizontal ? this.columnStretch(i) : this.rowStretch(i);
            if (explicit > 0) weights[i] = explicit;
            priorities[i] = weights[i]! > 0 ? 3 : expanding[i] ? 2 : 1;
        }
        for (let i = 0; i < count; ++i) if (weights[i] === 0) weights[i] = 1;
        return { minimums, preferred, maximums, weights, priorities };
    }

    #preferredRowSizes(): number[] { return this.#axisMetrics(false).preferred; }
    #preferredColumnSizes(): number[] { return this.#axisMetrics(true).preferred; }
    #calculateColumnSizes(available: number): number[] { return this.#axisSizes(available, true); }
    #axisSizes(available: number, horizontal: boolean, columnSizes?: number[]): number[] {
        const axis = this.#axisMetrics(horizontal, columnSizes);
        return CLayout.layoutAxisSizes(available, axis.minimums, axis.preferred, axis.maximums, axis.weights, axis.priorities);
    }

	#ensureSpanSize(
		sizes: number[],
		start: number,
		span: number,
		required: number
	): void
	{
		let current = 0;

		for (let i = start; i < start + span; ++i)
			current += sizes[i]!;

		if (current >= required)
			return;

		let missing = required - current;

		while (missing > 0) {
			const amount = missing / span;

			for (let i = start; i < start + span; ++i)
				sizes[i]! += amount;

			missing = 0;
		}
	}

	#positions(
		start: number,
		sizes: number[],
		spacing: number
	): number[]
	{
		const positions: number[] = [];
		let position = start;

		for (const size of sizes) {
			positions.push(position);
			position += size + spacing;
		}

		return positions;
	}

	#spanSize(
		sizes: number[],
		start: number,
		span: number,
		spacing: number
	): number
	{
		let size = Math.max(0, span - 1) * spacing;

		for (let i = start; i < start + span; ++i)
			size += sizes[i]!;

		return size;
	}

	#sum(values: number[]): number {
		return values.reduce(
			(sum, value) => sum + value,
			0
		);
	}
}