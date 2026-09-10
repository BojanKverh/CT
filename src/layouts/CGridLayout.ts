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

			const minimum = widget.minimumSize();
			const maximum = widget.maximumSize();

			widget.setGeometry(
				columnPositions[gridItem.column()]!,
				rowPositions[gridItem.row()]!,
				Math.min(
					maximum.width(),
					Math.max(width, minimum.width())
				),
				Math.min(
					maximum.height(),
					Math.max(height, minimum.height())
				)
			);
		}
	}

	#preferredRowSizes(): number[] {
		const sizes =
			new Array<number>(this.rowCount()).fill(0);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;
			const widget = gridItem.widget();

			const minimum = widget.minimumSize();
			const maximum = widget.maximumSize();
			const hint = widget.sizeHint();

			const preferred = Math.min(
				maximum.height(),
				Math.max(minimum.height(), hint.height())
			);

			this.#ensureSpanSize(
				sizes,
				gridItem.row(),
				gridItem.rowSpan(),
				preferred
			);
		}

		return sizes;
	}

	#preferredColumnSizes(): number[] {
		const sizes =
			new Array<number>(this.columnCount()).fill(0);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;
			const widget = gridItem.widget();

			const minimum = widget.minimumSize();
			const maximum = widget.maximumSize();
			const hint = widget.sizeHint();

			const preferred = Math.min(
				maximum.width(),
				Math.max(minimum.width(), hint.width())
			);

			this.#ensureSpanSize(
				sizes,
				gridItem.column(),
				gridItem.columnSpan(),
				preferred
			);
		}

		return sizes;
	}

	#minimumRowSizes(): number[] {
		const sizes =
			new Array<number>(this.rowCount()).fill(0);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;
			const widget = gridItem.widget();

			this.#ensureSpanSize(
				sizes,
				gridItem.row(),
				gridItem.rowSpan(),
				widget.minimumSize().height()
			);
		}

		return sizes;
	}

	#minimumColumnSizes(): number[] {
		const sizes =
			new Array<number>(this.columnCount()).fill(0);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;
			const widget = gridItem.widget();

			this.#ensureSpanSize(
				sizes,
				gridItem.column(),
				gridItem.columnSpan(),
				widget.minimumSize().width()
			);
		}

		return sizes;
	}

	#maximumRowSizes(): number[] {
		const count = this.rowCount();
		const sizes = new Array<number>(count).fill(
			Number.MAX_SAFE_INTEGER
		);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;

			if (gridItem.rowSpan() !== 1)
				continue;

			const widget = gridItem.widget();
			const row = gridItem.row();

			sizes[row] = Math.min(
				sizes[row]!,
				widget.maximumSize().height()
			);
		}

		return sizes;
	}

	#maximumColumnSizes(): number[] {
		const count = this.columnCount();
		const sizes = new Array<number>(count).fill(
			Number.MAX_SAFE_INTEGER
		);

		for (const item of this.items()) {
			const gridItem = item as CGridLayoutItem;

			if (gridItem.columnSpan() !== 1)
				continue;

			const widget = gridItem.widget();
			const column = gridItem.column();

			sizes[column] = Math.min(
				sizes[column]!,
				widget.maximumSize().width()
			);
		}

		return sizes;
	}

	#calculateRowSizes(available: number): number[] {
		return this.#calculateSizes(
			available,
			this.#minimumRowSizes(),
			this.#preferredRowSizes(),
			this.#maximumRowSizes(),
			index => this.rowStretch(index)
		);
	}

	#calculateColumnSizes(available: number): number[] {
		return this.#calculateSizes(
			available,
			this.#minimumColumnSizes(),
			this.#preferredColumnSizes(),
			this.#maximumColumnSizes(),
			index => this.columnStretch(index)
		);
	}

	#calculateSizes(
		available: number,
		minimums: number[],
		preferred: number[],
		maximums: number[],
		stretchAt: (index: number) => number
	): number[]
	{
		const count = minimums.length;

		const totalMinimum = this.#sum(minimums);
		const totalPreferred = this.#sum(preferred);

		if (available >= totalPreferred) {
			const sizes = [...preferred];
			const stretches: number[] = [];

			let hasStretch = false;

			for (let i = 0; i < count; ++i) {
				const stretch = stretchAt(i);
				stretches.push(stretch);

				if (stretch > 0)
					hasStretch = true;
			}

			if (!hasStretch) {
				for (let i = 0; i < count; ++i)
					stretches[i] = 1;
			}

			let extra = available - totalPreferred;

			while (extra > 0) {
				let totalStretch = 0;

				for (let i = 0; i < count; ++i) {
					if (
						stretches[i]! > 0
						&& sizes[i]! < maximums[i]!
					)
						totalStretch += stretches[i]!;
				}

				if (totalStretch === 0)
					break;

				let distributed = 0;

				for (let i = 0; i < count; ++i) {
					const stretch = stretches[i]!;

					if (
						stretch === 0
						|| sizes[i]! >= maximums[i]!
					)
						continue;

					const share =
						extra * stretch / totalStretch;

					const amount = Math.min(
						share,
						maximums[i]! - sizes[i]!
					);

					sizes[i]! += amount;
					distributed += amount;
				}

				if (distributed <= 0)
					break;

				extra -= distributed;
			}

			return sizes;
		}

		if (available >= totalMinimum) {
			const shrink = totalPreferred - available;

			const capacities = preferred.map(
				(size, index) =>
					size - minimums[index]!
			);

			const totalCapacity = this.#sum(capacities);

			if (totalCapacity === 0)
				return [...minimums];

			return preferred.map(
				(size, index) =>
					size
					- shrink
					* capacities[index]!
					/ totalCapacity
			);
		}

		return [...minimums];
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