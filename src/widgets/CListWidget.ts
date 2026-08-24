import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CMouseButton } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CScrollArea } from "./CScrollArea.js";
import { CWidget } from "./CWidget.js";
import { CListWidgetItem } from "./CListWidgetItem.js";

export enum CSelectionMode {
	SingleSelection,
	MultiSelection
}

class CListContentWidget extends CWidget
{
	#m_listWidget: CListWidget;

	constructor(listWidget: CListWidget)
	{
		super();

		this.#m_listWidget = listWidget;
	}

	protected override paintEvent(painter: CPainter): void
	{
		this.#m_listWidget.paintItems(painter);
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(
			this.#m_listWidget.rowAt(event.y())
		);

		event.accept();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(-1);

		event.accept();
	}

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const row = this.#m_listWidget.rowAt(event.y());

		this.#m_listWidget.setFocus();
		this.#m_listWidget.activateRow(row);

		event.accept();
	}
}

export class CListWidget extends CScrollArea
{
	static readonly ItemHeight = 28;
	static readonly HorizontalPadding = 8;

	#m_items: CListWidgetItem[] = [];

	#m_currentRow = -1;
	#m_hoveredRow = -1;

	#m_selectedRows = new Set<number>();
	#m_selectionMode = CSelectionMode.SingleSelection;

	#m_contentWidget: CListContentWidget;

	readonly currentRowChanged = new CSignal<[number]>();
	readonly itemClicked = new CSignal<[CListWidgetItem]>();
	readonly itemSelectionChanged = new CSignal<[]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.#m_contentWidget = new CListContentWidget(this);

		this.setWidget(this.#m_contentWidget);

		this.#updateContentGeometry();
	}

	addItem(item: string | CListWidgetItem): void
	{
		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.push(listItem);

		this.#updateContentGeometry();

		if (this.#m_currentRow === -1) {
			const row = this.#firstSelectableRow();

			if (row !== -1)
				this.setCurrentRow(row);
		}
	}

	insertItem(index: number, item: string | CListWidgetItem): void
	{
		index = Math.max(0, Math.min(index, this.#m_items.length));

		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.splice(index, 0, listItem);

		if (this.#m_currentRow >= index)
			++this.#m_currentRow;

		if (this.#m_hoveredRow >= index)
			++this.#m_hoveredRow;

		const selectedRows = new Set<number>();

		for (const row of this.#m_selectedRows)
			selectedRows.add(row >= index ? row + 1 : row);

		this.#m_selectedRows = selectedRows;

		this.#updateContentGeometry();

		if (this.#m_currentRow === -1) {
			const row = this.#firstSelectableRow();

			if (row !== -1)
				this.setCurrentRow(row);
		}
	}

	takeItem(index: number): CListWidgetItem | null
	{
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items.splice(index, 1)[0]!;

		const selectionChanged = this.#m_selectedRows.has(index);

		const selectedRows = new Set<number>();

		for (const row of this.#m_selectedRows) {
			if (row === index)
				continue;

			selectedRows.add(row > index ? row - 1 : row);
		}

		this.#m_selectedRows = selectedRows;

		if (this.#m_hoveredRow === index)
			this.#m_hoveredRow = -1;
		else if (this.#m_hoveredRow > index)
			--this.#m_hoveredRow;

		if (this.#m_currentRow === index) {
			this.#m_currentRow = -1;

			const row = this.#nearestSelectableRow(
				Math.min(index, this.#m_items.length - 1)
			);

			this.setCurrentRow(row);
		} else if (this.#m_currentRow > index) {
			--this.#m_currentRow;
		}

		this.#updateContentGeometry();

		if (selectionChanged)
			this.itemSelectionChanged.emit();

		return item;
	}

	clear(): void
	{
		if (this.#m_items.length === 0)
			return;

		const hadSelection = this.#m_selectedRows.size !== 0;
		const hadCurrent = this.#m_currentRow !== -1;

		this.#m_items = [];
		this.#m_selectedRows.clear();

		this.#m_currentRow = -1;
		this.#m_hoveredRow = -1;

		this.#updateContentGeometry();

		if (hadCurrent)
			this.currentRowChanged.emit(-1);

		if (hadSelection)
			this.itemSelectionChanged.emit();
	}

	count(): number
	{
		return this.#m_items.length;
	}

	item(row: number): CListWidgetItem | null
	{
		return this.#m_items[row] ?? null;
	}

	row(item: CListWidgetItem): number
	{
		return this.#m_items.indexOf(item);
	}

	currentRow(): number
	{
		return this.#m_currentRow;
	}

	currentItem(): CListWidgetItem | null
	{
		return this.item(this.#m_currentRow);
	}

	setCurrentRow(row: number): void
	{
		if (row < -1 || row >= this.#m_items.length)
			return;

		if (row !== -1 && !this.#isSelectableRow(row))
			return;

		if (row === this.#m_currentRow)
			return;

		this.#m_currentRow = row;

		if (this.#m_selectionMode === CSelectionMode.SingleSelection) {
			const hadSelection = this.#m_selectedRows.size !== 0;

			this.#m_selectedRows.clear();

			if (row !== -1)
				this.#m_selectedRows.add(row);

			if (hadSelection || row !== -1)
				this.itemSelectionChanged.emit();
		}

		this.#m_contentWidget.update();
		this.currentRowChanged.emit(row);
	}

	selectionMode(): CSelectionMode
	{
		return this.#m_selectionMode;
	}

	setSelectionMode(mode: CSelectionMode): void
	{
		if (mode === this.#m_selectionMode)
			return;

		this.#m_selectionMode = mode;

		if (mode === CSelectionMode.SingleSelection) {
			const selected =
				this.#m_currentRow !== -1 &&
				this.#isSelectableRow(this.#m_currentRow);

			this.#m_selectedRows.clear();

			if (selected)
				this.#m_selectedRows.add(this.#m_currentRow);

			this.itemSelectionChanged.emit();
		}

		this.#m_contentWidget.update();
	}

	isItemSelected(row: number): boolean
	{
		return this.#m_selectedRows.has(row);
	}

	setItemSelected(row: number, selected: boolean): void
	{
		if (!this.#isSelectableRow(row))
			return;

		if (this.#m_selectionMode === CSelectionMode.SingleSelection) {
			if (!selected) {
				if (!this.#m_selectedRows.has(row))
					return;

				this.#m_selectedRows.delete(row);
			} else {
				if (
					this.#m_selectedRows.size === 1 &&
					this.#m_selectedRows.has(row)
				)
					return;

				this.#m_selectedRows.clear();
				this.#m_selectedRows.add(row);

				this.#m_currentRow = row;
				this.currentRowChanged.emit(row);
			}
		} else {
			if (selected) {
				if (this.#m_selectedRows.has(row))
					return;

				this.#m_selectedRows.add(row);
			} else {
				if (!this.#m_selectedRows.delete(row))
					return;
			}
		}

		this.#m_contentWidget.update();
		this.itemSelectionChanged.emit();
	}

	selectedRows(): number[]
	{
		return [...this.#m_selectedRows].sort((a, b) => a - b);
	}

	selectedItems(): CListWidgetItem[]
	{
		return this.selectedRows().map(
			row => this.#m_items[row]!
		);
	}

	clearSelection(): void
	{
		if (this.#m_selectedRows.size === 0)
			return;

		this.#m_selectedRows.clear();

		this.#m_contentWidget.update();
		this.itemSelectionChanged.emit();
	}

	rowAt(y: number): number
	{
		if (y < 0)
			return -1;

		const row = Math.floor(y / CListWidget.ItemHeight);

		if (row >= this.#m_items.length)
			return -1;

		return row;
	}

	setHoveredRow(row: number): void
	{
		if (row === this.#m_hoveredRow)
			return;

		this.#m_hoveredRow = row;

		this.#m_contentWidget.update();
	}

	activateRow(row: number): void
	{
		if (!this.#isSelectableRow(row))
			return;

		const oldCurrentRow = this.#m_currentRow;

		this.#m_currentRow = row;

		if (oldCurrentRow !== row)
			this.currentRowChanged.emit(row);

		if (this.#m_selectionMode === CSelectionMode.SingleSelection) {
			const changed =
				this.#m_selectedRows.size !== 1 ||
				!this.#m_selectedRows.has(row);

			this.#m_selectedRows.clear();
			this.#m_selectedRows.add(row);

			if (changed)
				this.itemSelectionChanged.emit();
		} else {
			if (this.#m_selectedRows.has(row))
				this.#m_selectedRows.delete(row);
			else
				this.#m_selectedRows.add(row);

			this.itemSelectionChanged.emit();
		}

		this.#m_contentWidget.update();

		this.itemClicked.emit(this.#m_items[row]!);
	}

	paintItems(painter: CPainter): void
	{
		const palette = this.palette();

		painter.setBrush(
			palette.color(CPaletteColorRole.Base).toCss()
		);

		painter.fillRect(
			new CRect(
				0,
				0,
				this.#m_contentWidget.width(),
				this.#m_contentWidget.height()
			)
		);

		painter.setFont(this.font());
		painter.setTextAlign("left");
		painter.setTextBaseline("middle");

		for (let row = 0; row < this.#m_items.length; ++row) {
			const item = this.#m_items[row]!;
			const y = row * CListWidget.ItemHeight;

			const selected = this.#m_selectedRows.has(row);

			if (selected) {
				painter.setBrush(
					palette.color(
						CPaletteColorRole.Highlight
					).toCss()
				);

				painter.fillRect(
					new CRect(
						0,
						y,
						this.#m_contentWidget.width(),
						CListWidget.ItemHeight
					)
				);
			}

			const textRole = !item.isEnabled()
				? CPaletteColorRole.DisabledText
				: selected
					? CPaletteColorRole.HighlightedText
					: CPaletteColorRole.Text;

			painter.setPen(
				palette.color(textRole).toCss()
			);

			painter.drawText(
				item.text(),
				CListWidget.HorizontalPadding,
				y + CListWidget.ItemHeight / 2
			);
		}
	}

	protected override keyPressEvent(event: CKeyEvent): void
	{
		switch (event.key()) {
			case "ArrowDown":
				this.#selectRow(1);
				event.accept();
				break;

			case "ArrowUp":
				this.#selectRow(-1);
				event.accept();
				break;

			case "Home":
				this.setCurrentRow(
					this.#firstSelectableRow()
				);
				event.accept();
				break;

			case "End":
				this.setCurrentRow(
					this.#lastSelectableRow()
				);
				event.accept();
				break;

			case "Enter": {
				const item = this.currentItem();

				if (item !== null)
					this.itemClicked.emit(item);

				event.accept();
				break;
			}

			default:
				event.ignore();
				break;
		}
	}

	#selectRow(direction: 1 | -1): void
	{
		if (this.#m_items.length === 0)
			return;

		let row = this.#m_currentRow;

		if (row === -1)
			row = direction === 1
				? -1
				: this.#m_items.length;

		for (let i = 0; i < this.#m_items.length; ++i) {
			row = (
				row +
				direction +
				this.#m_items.length
			) % this.#m_items.length;

			if (this.#isSelectableRow(row)) {
				this.setCurrentRow(row);
				return;
			}
		}
	}

	#isSelectableRow(row: number): boolean
	{
		const item = this.#m_items[row];

		return item !== undefined && item.isEnabled();
	}

	#firstSelectableRow(): number
	{
		for (let row = 0; row < this.#m_items.length; ++row) {
			if (this.#isSelectableRow(row))
				return row;
		}

		return -1;
	}

	#lastSelectableRow(): number
	{
		for (
			let row = this.#m_items.length - 1;
			row >= 0;
			--row
		) {
			if (this.#isSelectableRow(row))
				return row;
		}

		return -1;
	}

	#nearestSelectableRow(row: number): number
	{
		if (row < 0)
			return -1;

		for (let i = row; i < this.#m_items.length; ++i) {
			if (this.#isSelectableRow(i))
				return i;
		}

		for (let i = row - 1; i >= 0; --i) {
			if (this.#isSelectableRow(i))
				return i;
		}

		return -1;
	}

	#updateContentGeometry(): void
	{
		const height = this.#m_items.length * CListWidget.ItemHeight;
		this.#m_contentWidget.resize(this.width(), height);
		this.updateScrollBars();

		this.#m_contentWidget.resize(this.viewport().width(), height);
		this.updateScrollBars();

		this.#m_contentWidget.update();
	}
}