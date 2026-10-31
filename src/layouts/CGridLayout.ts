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
	#m_rowStretch = new Map<number, number>();
	#m_columnStretch = new Map<number, number>();

	/**
	 * Adds a widget to the grid.
	 *
	 * Without coordinates, the widget is placed automatically. Explicit
	 * coordinates may also specify row and column spans.
	 */
	override addWidget(widget: CWidget): void;
	override addWidget(widget: CWidget, row: number, column: number,
		rowSpan?: number, columnSpan?: number): void;

	override addWidget(widget: CWidget, row?: number, column?: number,
		rowSpan = 1, columnSpan = 1): void
	{
		if (row === undefined || column === undefined) {
			row = this.rowCount();
			column = 0;
		}

		if (row < 0 || column < 0)
			return;

		if (rowSpan < 1 || columnSpan < 1)
			return;

		this.addItem(new CGridLayoutItem(widget, row, column, rowSpan,
				columnSpan));
	}

	/** Returns the number of rows currently occupied by grid items. */
	rowCount(): number {
		let count = 0;

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;

			count = Math.max(count, gridItem.row() + gridItem.rowSpan());
		}

		return count;
	}

	/** Returns the number of columns currently occupied by grid items. */
	columnCount(): number {
		let count = 0;

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;

			count = Math.max(count, gridItem.column() + gridItem.columnSpan());
		}

		return count;
	}

	/** Sets the non-negative stretch factor for a row. */
	setRowStretch(row: number, stretch: number): void {
		if (row < 0 || stretch < 0)
			return;

		if (stretch === 0)
			this.#m_rowStretch.delete(row);
		else
			this.#m_rowStretch.set(row, stretch);

		this.update();
	}

	/** Sets the non-negative stretch factor for a column. */
	setColumnStretch(column: number, stretch: number): void {
		if (column < 0 || stretch < 0)
			return;

		if (stretch === 0)
			this.#m_columnStretch.delete(column);
		else
			this.#m_columnStretch.set(column, stretch);

		this.update();
	}

	/** Returns the stretch factor for a row. */
	rowStretch(row: number): number {
		return this.#m_rowStretch.get(row) ?? 0;
	}

	/** Returns the stretch factor for a column. */
	columnStretch(column: number): number {
		return this.#m_columnStretch.get(column) ?? 0;
	}

	/** Returns the preferred size required by the grid. */
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

	/** Recalculates and applies grid-cell geometries. */
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

		const rowSizes = this.#calculateRowSizes(
			availableHeight
		);

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
			const gridItem = item as CGridLayoutItem;
			const widget = gridItem.widget();

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

            const horizontal = CLayout.layoutAxisBounds(widget, true);
            const vertical = CLayout.layoutAxisBounds(widget, false);
            widget.setGeometry(columnPositions[gridItem.column()]!, rowPositions[gridItem.row()]!,
                Math.min(horizontal.maximum, Math.max(horizontal.minimum, width)),
                Math.min(vertical.maximum, Math.max(vertical.minimum, height)));
		}
	}

    #axisMetrics(horizontal: boolean) {
        const count = horizontal ? this.columnCount() : this.rowCount();
        const minimums = new Array<number>(count).fill(0);
        const preferred = new Array<number>(count).fill(0);
        const maximums = new Array<number>(count).fill(0);
        const weights = new Array<number>(count).fill(0);
        const expanding = new Array<boolean>(count).fill(false);
        for (const entry of this.items()) {
            const item = entry as CGridLayoutItem;
            const widget = item.widget();
            const start = horizontal ? item.column() : item.row();
            const span = horizontal ? item.columnSpan() : item.rowSpan();
            const bounds = CLayout.layoutAxisBounds(widget, horizontal);
            const spacing = (span - 1) * this.spacing();
            this.#ensureSpanSize(minimums, start, span, Math.max(0, bounds.minimum - spacing));
            this.#ensureSpanSize(preferred, start, span, Math.max(0, bounds.preferred - spacing));
            const policy = widget.sizePolicy();
            const axis = horizontal ? policy.horizontalPolicy() : policy.verticalPolicy();
            const stretch = horizontal ? policy.horizontalStretch() : policy.verticalStretch();
            for (let i = start; i < start + span; ++i) {
                maximums[i] = Math.max(maximums[i]!, Math.max(0, bounds.maximum - spacing) / span);
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
    #calculateRowSizes(available: number): number[] { return this.#axisSizes(available, false); }
    #calculateColumnSizes(available: number): number[] { return this.#axisSizes(available, true); }
    #axisSizes(available: number, horizontal: boolean): number[] {
        const axis = this.#axisMetrics(horizontal);
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