/** @module Widgets/CListWidget */
import { CSize } from "../geometry/CSize.js";
import { CListViewHelper, CListViewMode } from "./CListViewHelper.js";
export { CListViewMode } from "./CListViewHelper.js";
import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyboardModifier, CMouseButton } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CScrollArea } from "./CScrollArea.js";
import { CWidget } from "./CWidget.js";
import { CListWidgetItem } from "./CListWidgetItem.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

/** Defines the available selection mode values. */
export enum CSelectionMode {
    /** Keep at most one item selected; selecting another item clears the previous selection. */
    SingleSelection,
    /** Allow separate selected items; clicks toggle items and Shift extends selection from the anchor row. */
    MultiSelection
}

class CListContentWidget extends CWidget
{
	#m_listWidget: CListWidget;

	constructor(listWidget: CListWidget)
	{
		super();

		this.#m_listWidget = listWidget;
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	protected override paintEvent(painter: CPainter): void
	{
		this.#m_listWidget.paintItems(painter);
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(
			this.#m_listWidget.rowAt(event.y(), event.x())
		);

		event.accept();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(-1);

		event.accept();
	}

    protected override keyPressEvent(event: CKeyEvent): void { this.#m_listWidget.contentKeyPressEvent(event); }
    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton || this.#m_listWidget.viewMode() !== CListViewMode.IconMode) { event.ignore(); return; }
        const row = this.#m_listWidget.rowAt(event.y(), event.x());
        const item = this.#m_listWidget.item(row);
        if (!item?.isEnabled()) { event.ignore(); return; }
        this.setFocus();
        this.#m_listWidget.activateRow(row, event.modifiers());
        this.#m_listWidget.itemActivated.emit(item); event.accept();
    }

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const row = this.#m_listWidget.rowAt(event.y(), event.x());

		if (this.#m_listWidget.viewMode() === CListViewMode.IconMode) this.setFocus();
        else this.#m_listWidget.setFocus();
		this.#m_listWidget.activateRow(row, event.modifiers());

		event.accept();
	}
}

/** Item-based list and icon grid owning CListWidgetItem entries and their selection state. */
export class CListWidget extends CScrollArea
{
    /** Default logical height of a list or menu entry. */
    static readonly ItemHeight = 28;
    /** Logical horizontal inset around content. */
    static readonly HorizontalPadding = 8;

	#m_items: CListWidgetItem[] = [];
    #m_itemLayout = new CListViewHelper(CListWidget.ItemHeight);
    #m_itemConnections = new Map<CListWidgetItem, () => void>();
    /**
    * Emitted with the list item activated by keyboard or pointer interaction.
    * @group Signals
    */
    readonly itemActivated = new CSignal<[CListWidgetItem]>();

	#m_currentRow = -1;
	#m_hoveredRow = -1;

	#m_selectedRows = new Set<number>();
	#m_selectionMode = CSelectionMode.SingleSelection;

	#m_contentWidget: CListContentWidget;

    /**
    * Emitted with the zero-based current row, or -1 when no row is current.
    * @group Signals
    */
    readonly currentRowChanged = new CSignal<[number]>();
    /**
    * Emitted with the list item clicked by the pointer.
    * @group Signals
    */
    readonly itemClicked = new CSignal<[CListWidgetItem]>();
    /**
    * Emitted after the set of selected list items changes.
    * @group Signals
    */
    readonly itemSelectionChanged = new CSignal<[]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.#m_contentWidget = new CListContentWidget(this);

		this.setWidget(this.#m_contentWidget);

		this.#updateContentGeometry();
	}

    /**
    * Returns whether items are arranged as a list or icon grid.
    */
    viewMode(): CListViewMode { return this.#m_itemLayout.mode; }
    /**
    * Changes list/icon-grid arrangement and recalculates content geometry.
    */
    setViewMode(mode: CListViewMode): void {
        if (mode !== CListViewMode.ListMode && mode !== CListViewMode.IconMode) return;
        if (this.#m_itemLayout.mode === mode) return;
        this.#m_itemLayout.mode = mode;
        this.#m_hoveredRow = -1;
        this.scrollTo(0, 0);
        this.#updateContentGeometry();
    }
    /**
    * Returns the icon-grid cell size used by item layout.
    */
    gridSize(): CSize { return this.#m_itemLayout.gridSize(); }
    /**
    * Sets icon-grid cell dimensions and updates content extent.
    */
    setGridSize(size: CSize): void { this.#m_itemLayout.setGridSize(size); this.#updateContentGeometry(); }
    /**
    * Returns the preferred icon box used when painting items.
    */
    iconSize(): CSize { return this.#m_itemLayout.iconSize(); }
    /**
    * Changes preferred icon dimensions and updates item geometry.
    */
    setIconSize(size: CSize): void { this.#m_itemLayout.setIconSize(size); this.#updateContentGeometry(); }
    /**
    * Returns the gap between laid-out items.
    */
    spacing(): number { return this.#m_itemLayout.spacing(); }
    /**
    * Changes the gap between items and updates content extent.
    */
    setSpacing(spacing: number): void { this.#m_itemLayout.setSpacing(spacing); this.#updateContentGeometry(); }

    /**
    * Returns an item's visible layout rectangle.
    */
    visualItemRect(item: CListWidgetItem): CRect {
        const row = this.row(item);
        return row < 0 ? new CRect() : this.#m_itemLayout.rect(row, this.#m_contentWidget.width());
    }
    #connectItem(item: CListWidgetItem): void {
        if (this.#m_itemConnections.has(item)) return;
        this.#m_itemConnections.set(item, item.changed.connect(() => this.#m_contentWidget.update()));
    }
    override destroy(): void {
        for (const disconnect of this.#m_itemConnections.values()) disconnect();
        this.#m_itemConnections.clear(); super.destroy();
    }
    /**
    * @internal Routes input from the internal content widget.
    */
    contentKeyPressEvent(event: CKeyEvent): void { this.keyPressEvent(event); }

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void
	{
		super.setGeometry(x, y, width, height);
		this.#updateContentGeometry();
	}

    /** Resizes the widget and updates the scrollable item area. */
    override resize(width: number, height: number): void
	{
		super.resize(width, height);
		this.#updateContentGeometry();
	}

    /**
    * Appends an item or creates a text item from a string.
    */
    addItem(item: string | CListWidgetItem): void
	{
		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.push(listItem);
        this.#connectItem(listItem);

		this.#updateContentGeometry();

		if (this.#m_currentRow === -1) {
			const row = this.#firstSelectableRow();

			if (row !== -1)
				this.setCurrentRow(row);
		}
	}

    /**
    * Inserts an existing item or a text item at a requested row.
    */
    insertItem(index: number, item: string | CListWidgetItem): void
	{
		index = Math.max(0, Math.min(index, this.#m_items.length));

		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.splice(index, 0, listItem);
        this.#connectItem(listItem);

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

    /**
    * Removes an item by row and returns it, transferring responsibility to the caller.
    */
    takeItem(index: number): CListWidgetItem | null
	{
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items.splice(index, 1)[0]!;
        if (!this.#m_items.includes(item)) { this.#m_itemConnections.get(item)?.(); this.#m_itemConnections.delete(item); }

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

    /**
    * Removes all items, current-row state and selected rows.
    */
    clear(): void
	{
		if (this.#m_items.length === 0)
			return;

		const hadSelection = this.#m_selectedRows.size !== 0;
		const hadCurrent = this.#m_currentRow !== -1;

		for (const disconnect of this.#m_itemConnections.values()) disconnect();
        this.#m_itemConnections.clear();
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

    /**
    * Returns the number of retained items.
    */
    count(): number
	{
		return this.#m_items.length;
	}

    /**
    * Returns the item at a zero-based row, or null.
    */
    item(row: number): CListWidgetItem | null
	{
		return this.#m_items[row] ?? null;
	}

    /**
    * Returns an item's zero-based row, or -1 when absent.
    */
    row(item: CListWidgetItem): number
	{
		return this.#m_items.indexOf(item);
	}

    /**
    * Zero-based current row.
    * The initial value is `-1`.
    */
    currentRow(): number
	{
		return this.#m_currentRow;
	}

    /**
    * Returns the keyboard-current item or null.
    */
    currentItem(): CListWidgetItem | null
	{
		return this.item(this.#m_currentRow);
	}

    /**
    * Moves the current row and updates selection according to selectionMode().
    */
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
        if (this.viewMode() === CListViewMode.IconMode) this.#ensureCurrentVisible();
		this.currentRowChanged.emit(row);
	}

    /**
    * Policy controlling single and multiple selection.
    * The initial value is `CSelectionMode.SingleSelection`.
    */
    selectionMode(): CSelectionMode
	{
		return this.#m_selectionMode;
	}

    /**
    * Changes how pointer and keyboard interactions select items.
    */
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

    /**
    * Reports whether a row belongs to the current selection.
    */
    isItemSelected(row: number): boolean
	{
		return this.#m_selectedRows.has(row);
	}

    /**
    * Adds or removes an individual row from selection according to the selection policy.
    */
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

    /**
    * Returns the currently selected row positions.
    */
    selectedRows(): number[]
	{
		return [...this.#m_selectedRows].sort((a, b) => a - b);
	}

    /**
    * Returns references to currently selected item objects.
    */
    selectedItems(): CListWidgetItem[]
	{
		return this.selectedRows().map(
			row => this.#m_items[row]!
		);
	}

    /**
    * Clears selected rows while retaining items.
    */
    clearSelection(): void
	{
		if (this.#m_selectedRows.size === 0)
			return;

		this.#m_selectedRows.clear();

		this.#m_contentWidget.update();
		this.itemSelectionChanged.emit();
	}

    /**
    * Maps content coordinates to an item row, or -1 outside an item.
    */
    rowAt(y: number, x = 0): number {
        if (this.viewMode() === CListViewMode.IconMode)
            return this.#m_itemLayout.rowAt(x, y, this.#m_contentWidget.width(), this.count());
        if (y < 0) return -1;
        const row = Math.floor(y / CListWidget.ItemHeight);
        return row < this.count() ? row : -1;
    }

    /**
    * @internal Updates item hover feedback.
    */
    setHoveredRow(row: number): void
	{
		if (row === this.#m_hoveredRow)
			return;

		this.#m_hoveredRow = row;

		this.#m_contentWidget.update();
	}

    /**
    * @internal Applies pointer activation and selection modifiers to an item row.
    */
    activateRow(row: number, modifiers: number): void
	{
		if (!this.#isSelectableRow(row))
			return;

		const anchorRow = this.#m_currentRow;
		const currentChanged = row !== this.#m_currentRow;

		this.#m_currentRow = row;

		const oldSelection = this.selectedRows();
		const shiftPressed = (modifiers & CKeyboardModifier.ShiftModifier) > 0;

		if (this.#m_selectionMode === CSelectionMode.MultiSelection && shiftPressed && anchorRow !== -1) {
			const first = Math.min(anchorRow, row);
			const last = Math.max(anchorRow, row);

			for (let i = first; i <= last; ++i) {
				if (this.#isSelectableRow(i))
					this.#m_selectedRows.add(i);
			}
		} else if (this.#m_selectionMode === CSelectionMode.MultiSelection) {
			if (this.#m_selectedRows.has(row))
				this.#m_selectedRows.delete(row);
			else
				this.#m_selectedRows.add(row);
		} else {
			this.#m_selectedRows.clear();
			this.#m_selectedRows.add(row);
		}

		const selectionChanged =
			oldSelection.length !== this.#m_selectedRows.size ||
			oldSelection.some(oldRow => !this.#m_selectedRows.has(oldRow));

		if (currentChanged)
			this.currentRowChanged.emit(row);

		if (selectionChanged)
			this.itemSelectionChanged.emit();

		this.#m_contentWidget.update();
		this.itemClicked.emit(this.#m_items[row]!);
	}

    /**
    * @internal Paints visible items on the list's content surface.
    */
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
			const rect = this.#m_itemLayout.rect(row, this.#m_contentWidget.width());
            if (this.viewMode() === CListViewMode.IconMode && (rect.y() + rect.height() <= this.scrollY()
                || rect.y() >= this.scrollY() + this.viewport().height())) continue;
            const y = rect.y();

			const selected = this.#m_selectedRows.has(row);
			const hovered = (row === this.#m_hoveredRow);

			if (selected || hovered) {
				if (selected)
					painter.setBrush(palette.color(CPaletteColorRole.Highlight).toCss());
				else
					painter.setBrush(palette.color(CPaletteColorRole.Hover).toCss());

                painter.fillRect(rect);
			}

			const textRole = !item.isEnabled()
				? CPaletteColorRole.DisabledText
				: selected
					? CPaletteColorRole.HighlightedText
					: CPaletteColorRole.Text;

			painter.setPen(
				palette.color(textRole).toCss()
			);

            if (this.viewMode() === CListViewMode.IconMode) {
                this.#m_itemLayout.paintContents(painter, this, rect, item.text(), item.icon(), item.isEnabled());
                continue;
            }
			painter.drawText(
				item.text(),
				CListWidget.HorizontalPadding,
				y + CListWidget.ItemHeight / 2
			);
		}
	}

	protected override keyPressEvent(event: CKeyEvent): void
	{
        if (this.viewMode() === CListViewMode.IconMode) {
            if (event.key() === "Enter") {
                const item = this.currentItem();
                if (!item?.isEnabled()) { event.ignore(); return; }
                this.itemActivated.emit(item); event.accept(); return;
            }
            let row = this.#m_currentRow < 0 ? 0 : this.#m_currentRow;
            const next = this.#m_itemLayout.navigate(row, event.key(), this.count(), this.#m_contentWidget.width(), this.viewport().height());
            if (next === null || this.count() === 0) { event.ignore(); return; }
            if (this.#m_currentRow < 0) row = this.#firstSelectableRow();
            else if (event.key() === "Home") row = this.#firstSelectableRow();
            else if (event.key() === "End") row = this.#lastSelectableRow();
            else {
                /**
                 * Returns an item's zero-based row, or -1 when absent.
                 */
                row = next;
                const direction = next < this.#m_currentRow ? -1 : 1;
                while (row >= 0 && row < this.count() && !this.#isSelectableRow(row) && next !== this.#m_currentRow) {
                    const candidate = this.#m_itemLayout.navigate(row, event.key(), this.count(), this.#m_contentWidget.width(), this.viewport().height());
                    if (candidate === null || candidate === row || (direction < 0 ? candidate > row : candidate < row)) { row = this.#m_currentRow; break; }
                    /**
                     * Returns an item's zero-based row, or -1 when absent.
                     */
                    row = candidate;
                }
            }
            if (this.#isSelectableRow(row)) this.setCurrentRow(row);
            this.#ensureCurrentVisible(); event.accept(); return;
        }

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
			/**
			 * Returns an item's zero-based row, or -1 when absent.
			 */
			row = direction === 1
				? -1
				: this.#m_items.length;

		for (let i = 0; i < this.#m_items.length; ++i) {
			/**
			 * Returns an item's zero-based row, or -1 when absent.
			 */
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

	#updateContentGeometry(): void {
        if (this.viewMode() === CListViewMode.IconMode) {
            const frame = this.frameWidth();
            const size = this.#m_itemLayout.contentSize(this.count(), Math.max(0, this.width() - 2 * frame),
                Math.max(0, this.height() - 2 * frame), CScrollArea.ScrollBarExtent);
            this.#m_contentWidget.resize(size.width(), size.height()); this.updateScrollBars();
            this.#ensureCurrentVisible(); this.#m_contentWidget.update(); return;
        }

		const height = this.#m_items.length * CListWidget.ItemHeight;
		this.#m_contentWidget.resize(this.viewport().width(), height);
		this.updateScrollBars();
		this.#m_contentWidget.resize(this.viewport().width(), height);
		this.updateScrollBars();
		this.#m_contentWidget.update();
	}
    #ensureCurrentVisible(): void {
        const item = this.currentItem(); if (item === null) return;
        const rect = this.visualItemRect(item);
        let x = this.scrollX(), y = this.scrollY();
        if (rect.x() < x) x = rect.x();
        else if (rect.x() + rect.width() > x + this.viewport().width()) x = rect.x() + rect.width() - this.viewport().width();
        if (rect.y() < y) y = rect.y();
        else if (rect.y() + rect.height() > y + this.viewport().height()) y = rect.y() + rect.height() - this.viewport().height();
        this.scrollTo(x, y);
    }

}
