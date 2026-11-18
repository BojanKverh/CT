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
	/** Represents single selection. */
	SingleSelection,
	/** Represents multi selection. */
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

	/**
	 * Draws the list content widget through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void
	{
		this.#m_listWidget.paintItems(painter);
	}

	/**
	 * Responds to pointer movement for the list content widget. May accept the event.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(
			this.#m_listWidget.rowAt(event.y(), event.x())
		);

		event.accept();
	}

	/**
	 * Responds to pointer exit for the list content widget. May accept the event.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		this.#m_listWidget.setHoveredRow(-1);

		event.accept();
	}

    /**
     * Responds to a key press for the list content widget.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void { this.#m_listWidget.contentKeyPressEvent(event); }
    /**
     * Responds to a double-click for the list content widget. May request focus and accept or ignore the event depending on the input. May emit `itemActivated`.
     * @param event Event for a double-click.
     */
    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton || this.#m_listWidget.viewMode() !== CListViewMode.IconMode) { event.ignore(); return; }
        const row = this.#m_listWidget.rowAt(event.y(), event.x());
        const item = this.#m_listWidget.item(row);
        if (!item?.isEnabled()) { event.ignore(); return; }
        this.setFocus();
        this.#m_listWidget.activateRow(row, event.modifiers());
        this.#m_listWidget.itemActivated.emit(item); event.accept();
    }

	/**
	 * Responds to a pointer button press for the list content widget. May request focus and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
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

/** Implements the list widget widget. */
export class CListWidget extends CScrollArea
{
	static readonly ItemHeight = 28;
	static readonly HorizontalPadding = 8;

	#m_items: CListWidgetItem[] = [];
    #m_itemLayout = new CListViewHelper(CListWidget.ItemHeight);
    #m_itemConnections = new Map<CListWidgetItem, () => void>();
    readonly itemActivated = new CSignal<[CListWidgetItem]>();

	#m_currentRow = -1;
	#m_hoveredRow = -1;

	#m_selectedRows = new Set<number>();
	#m_selectionMode = CSelectionMode.SingleSelection;

	#m_contentWidget: CListContentWidget;

	/** Signal emitted when current row changes. */
	readonly currentRowChanged = new CSignal<[number]>();
	/** Public item clicked member. */
	readonly itemClicked = new CSignal<[CListWidgetItem]>();
	/** Signal emitted when item selection changes. */
	readonly itemSelectionChanged = new CSignal<[]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		this.#m_contentWidget = new CListContentWidget(this);

		this.setWidget(this.#m_contentWidget);

		this.#updateContentGeometry();
	}

    /**
     * Reads the view mode of the list widget.
     * @returns The view mode.
     */
    viewMode(): CListViewMode { return this.#m_itemLayout.mode; }
    /**
     * Sets the view mode.
     * @param mode Mode.
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
     * Reads the grid size of the list widget.
     * @returns The grid size.
     */
    gridSize(): CSize { return this.#m_itemLayout.gridSize(); }
    /**
     * Changes the preferred size of an icon grid cell for valid dimensions.
     * @param size Requested cell width and height in logical pixels.
     */
    setGridSize(size: CSize): void { this.#m_itemLayout.setGridSize(size); this.#updateContentGeometry(); }
    /**
     * Reads the icon size of the list widget.
     * @returns The icon size.
     */
    iconSize(): CSize { return this.#m_itemLayout.iconSize(); }
    /**
     * Changes the preferred icon dimensions for valid sizes.
     * @param size Requested icon width and height in logical pixels.
     */
    setIconSize(size: CSize): void { this.#m_itemLayout.setIconSize(size); this.#updateContentGeometry(); }
    /**
     * Reads the spacing of the list widget.
     * @returns The spacing.
     */
    spacing(): number { return this.#m_itemLayout.spacing(); }
    /**
     * Sets the spacing.
     * @param spacing Spacing.
     */
    setSpacing(spacing: number): void { this.#m_itemLayout.setSpacing(spacing); this.#updateContentGeometry(); }

    /**
     * Computes the content rectangle of a managed list item using the current list or icon layout.
     * @param item List item to locate by identity.
     * @returns Item bounds in content coordinates, or an empty rectangle if absent.
     */
    visualItemRect(item: CListWidgetItem): CRect {
        const row = this.row(item);
        return row < 0 ? new CRect() : this.#m_itemLayout.rect(row, this.#m_contentWidget.width());
    }
    #connectItem(item: CListWidgetItem): void {
        if (this.#m_itemConnections.has(item)) return;
        this.#m_itemConnections.set(item, item.changed.connect(() => this.#m_contentWidget.update()));
    }
    /**
     * Releases resources held by the list widget.
     */
    override destroy(): void {
        for (const disconnect of this.#m_itemConnections.values()) disconnect();
        this.#m_itemConnections.clear(); super.destroy();
    }
    /**
     * Routes keyboard input from the content widget to the list's key handler.
     * @param event Keyboard event to handle for the view.
     */
    contentKeyPressEvent(event: CKeyEvent): void { this.keyPressEvent(event); }

	/**
	 * Sets the geometry and updates the scrollable item area.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
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

	/**
	 * Resizes the widget and updates the scrollable item area.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
	override resize(width: number, height: number): void
	{
		super.resize(width, height);
		this.#updateContentGeometry();
	}

	/**
	 * Adds item.
	 * @param item Item to operate on.
	 */
	addItem(item: string | CListWidgetItem): void
	{
		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.push(listItem);
        this.#connectItem(listItem);

		this.#updateContentGeometry();

		/** Provides if behavior. */
		if (this.#m_currentRow === -1) {
			const row = this.#firstSelectableRow();

			/** Provides if behavior. */
			if (row !== -1)
				this.setCurrentRow(row);
		}
	}

	/**
	 * Inserts item.
	 * @param index Zero-based item index.
	 * @param item Item to operate on.
	 */
	insertItem(index: number, item: string | CListWidgetItem): void
	{
		index = Math.max(0, Math.min(index, this.#m_items.length));

		const listItem = typeof item === "string"
			? new CListWidgetItem(item)
			: item;

		this.#m_items.splice(index, 0, listItem);
        this.#connectItem(listItem);

		/** Provides if behavior. */
		if (this.#m_currentRow >= index)
			++this.#m_currentRow;

		/** Provides if behavior. */
		if (this.#m_hoveredRow >= index)
			++this.#m_hoveredRow;

		const selectedRows = new Set<number>();

		/** Provides for behavior. */
		for (const row of this.#m_selectedRows)
			selectedRows.add(row >= index ? row + 1 : row);

		this.#m_selectedRows = selectedRows;

		this.#updateContentGeometry();

		/** Provides if behavior. */
		if (this.#m_currentRow === -1) {
			const row = this.#firstSelectableRow();

			/** Provides if behavior. */
			if (row !== -1)
				this.setCurrentRow(row);
		}
	}

	/**
	 * Removes an item and updates selection, current row and layout as needed.
	 * @param index Zero-based row to remove.
	 * @returns Removed item, or `null` if out of range.
	 */
	takeItem(index: number): CListWidgetItem | null
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items.splice(index, 1)[0]!;
        if (!this.#m_items.includes(item)) { this.#m_itemConnections.get(item)?.(); this.#m_itemConnections.delete(item); }

		const selectionChanged = this.#m_selectedRows.has(index);

		const selectedRows = new Set<number>();

		/** Provides for behavior. */
		for (const row of this.#m_selectedRows) {
			/** Provides if behavior. */
			if (row === index)
				continue;

			selectedRows.add(row > index ? row - 1 : row);
		}

		this.#m_selectedRows = selectedRows;

		/** Provides if behavior. */
		if (this.#m_hoveredRow === index)
			this.#m_hoveredRow = -1;
		else if (this.#m_hoveredRow > index)
			--this.#m_hoveredRow;

		/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (selectionChanged)
			this.itemSelectionChanged.emit();

		return item;
	}

	/** Clears the current contents. */
	clear(): void
	{
		/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (hadCurrent)
			this.currentRowChanged.emit(-1);

		/** Provides if behavior. */
		if (hadSelection)
			this.itemSelectionChanged.emit();
	}

	/**
	 * Counts the entries in the list widget.
	 * @returns The number of entries in the items.
	 */
	count(): number
	{
		return this.#m_items.length;
	}

	/**
	 * Looks up a managed list item.
	 * @param row Zero-based row.
	 * @returns Item in that row, or `null` if absent.
	 */
	item(row: number): CListWidgetItem | null
	{
		return this.#m_items[row] ?? null;
	}

	/**
	 * Finds the first occurrence of an item by identity.
	 * @param item List item to locate.
	 * @returns Zero-based row, or `-1` if the item is absent.
	 */
	row(item: CListWidgetItem): number
	{
		return this.#m_items.indexOf(item);
	}

	/**
	 * Returns the current row.
	 * @returns The current row.
	 */
	currentRow(): number
	{
		return this.#m_currentRow;
	}

	/**
	 * Looks up the item at the current row.
	 * @returns Current item, or `null` if no row is current.
	 */
	currentItem(): CListWidgetItem | null
	{
		return this.item(this.#m_currentRow);
	}

	/**
	 * Sets the current row.
	 * @param row Zero-based row.
	 */
	setCurrentRow(row: number): void
	{
		/** Provides if behavior. */
		if (row < -1 || row >= this.#m_items.length)
			return;

		/** Provides if behavior. */
		if (row !== -1 && !this.#isSelectableRow(row))
			return;

		/** Provides if behavior. */
		if (row === this.#m_currentRow)
			return;

		this.#m_currentRow = row;

		/** Provides if behavior. */
		if (this.#m_selectionMode === CSelectionMode.SingleSelection) {
			const hadSelection = this.#m_selectedRows.size !== 0;

			this.#m_selectedRows.clear();

			/** Provides if behavior. */
			if (row !== -1)
				this.#m_selectedRows.add(row);

			/** Provides if behavior. */
			if (hadSelection || row !== -1)
				this.itemSelectionChanged.emit();
		}

		this.#m_contentWidget.update();
        if (this.viewMode() === CListViewMode.IconMode) this.#ensureCurrentVisible();
		this.currentRowChanged.emit(row);
	}

	/**
	 * Reads the selection mode.
	 * @returns The selection mode.
	 */
	selectionMode(): CSelectionMode
	{
		return this.#m_selectionMode;
	}

	/**
	 * Sets the selection mode.
	 * @param mode Mode.
	 */
	setSelectionMode(mode: CSelectionMode): void
	{
		/** Provides if behavior. */
		if (mode === this.#m_selectionMode)
			return;

		this.#m_selectionMode = mode;

		/** Provides if behavior. */
		if (mode === CSelectionMode.SingleSelection) {
			const selected =
				this.#m_currentRow !== -1 &&
				this.#isSelectableRow(this.#m_currentRow);

			this.#m_selectedRows.clear();

			/** Provides if behavior. */
			if (selected)
				this.#m_selectedRows.add(this.#m_currentRow);

			this.itemSelectionChanged.emit();
		}

		this.#m_contentWidget.update();
	}

	/**
	 * Checks whether the list widget is item selected.
	 * @param row Zero-based row.
	 * @returns `true` if the list widget is item selected, otherwise `false`.
	 */
	isItemSelected(row: number): boolean
	{
		return this.#m_selectedRows.has(row);
	}

	/**
	 * Sets the item selected.
	 * @param row Zero-based row.
	 * @param selected Selected flag.
	 */
	setItemSelected(row: number, selected: boolean): void
	{
		/** Provides if behavior. */
		if (!this.#isSelectableRow(row))
			return;

		/** Provides if behavior. */
		if (this.#m_selectionMode === CSelectionMode.SingleSelection) {
			/** Provides if behavior. */
			if (!selected) {
				/** Provides if behavior. */
				if (!this.#m_selectedRows.has(row))
					return;

				this.#m_selectedRows.delete(row);
			} else {
				/** Provides if behavior. */
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
			/** Provides if behavior. */
			if (selected) {
				/** Provides if behavior. */
				if (this.#m_selectedRows.has(row))
					return;

				this.#m_selectedRows.add(row);
			} else {
				/** Provides if behavior. */
				if (!this.#m_selectedRows.delete(row))
					return;
			}
		}

		this.#m_contentWidget.update();
		this.itemSelectionChanged.emit();
	}

	/**
	 * Returns the selected rows.
	 * @returns The selected rows.
	 */
	selectedRows(): number[]
	{
		return [...this.#m_selectedRows].sort((a, b) => a - b);
	}

	/**
	 * Returns the selected items.
	 * @returns The selected items.
	 */
	selectedItems(): CListWidgetItem[]
	{
		return this.selectedRows().map(
			row => this.#m_items[row]!
		);
	}

	/** Clears selection. */
	clearSelection(): void
	{
		/** Provides if behavior. */
		if (this.#m_selectedRows.size === 0)
			return;

		this.#m_selectedRows.clear();

		this.#m_contentWidget.update();
		this.itemSelectionChanged.emit();
	}

	/** Provides row at behavior. */
    /**
     * Hit-tests a position in the list content. Icon mode uses both coordinates and rejects grid gaps.
     * @param y Vertical coordinate in list content.
     * @param x Horizontal coordinate in list content, used in icon mode. Defaults to zero.
     * @returns Hit row, or `-1` if the position hits no item.
     */
    rowAt(y: number, x = 0): number {
        if (this.viewMode() === CListViewMode.IconMode)
            return this.#m_itemLayout.rowAt(x, y, this.#m_contentWidget.width(), this.count());
        if (y < 0) return -1;
        const row = Math.floor(y / CListWidget.ItemHeight);
        return row < this.count() ? row : -1;
    }

	/**
	 * Sets the hovered row.
	 * @param row Zero-based row.
	 */
	setHoveredRow(row: number): void
	{
		/** Provides if behavior. */
		if (row === this.#m_hoveredRow)
			return;

		this.#m_hoveredRow = row;

		this.#m_contentWidget.update();
	}

	/**
	 * Activates the row. May emit `currentRowChanged`, `itemSelectionChanged`, `itemClicked`.
	 * @param row Zero-based row.
	 * @param modifiers Modifiers.
	 */
	activateRow(row: number, modifiers: number): void
	{
		/** Provides if behavior. */
		if (!this.#isSelectableRow(row))
			return;

		const anchorRow = this.#m_currentRow;
		const currentChanged = row !== this.#m_currentRow;

		this.#m_currentRow = row;

		const oldSelection = this.selectedRows();
		const shiftPressed = (modifiers & CKeyboardModifier.ShiftModifier) > 0;

		/** Provides if behavior. */
		if (this.#m_selectionMode === CSelectionMode.MultiSelection && shiftPressed && anchorRow !== -1) {
			const first = Math.min(anchorRow, row);
			const last = Math.max(anchorRow, row);

			/** Provides for behavior. */
			for (let i = first; i <= last; ++i) {
				/** Provides if behavior. */
				if (this.#isSelectableRow(i))
					this.#m_selectedRows.add(i);
			}
		} else if (this.#m_selectionMode === CSelectionMode.MultiSelection) {
			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (currentChanged)
			this.currentRowChanged.emit(row);

		/** Provides if behavior. */
		if (selectionChanged)
			this.itemSelectionChanged.emit();

		this.#m_contentWidget.update();
		this.itemClicked.emit(this.#m_items[row]!);
	}

	/**
	 * Paints the items.
	 * @param painter Painter for the current drawing operation.
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

		/** Provides for behavior. */
		for (let row = 0; row < this.#m_items.length; ++row) {
			const item = this.#m_items[row]!;
			const rect = this.#m_itemLayout.rect(row, this.#m_contentWidget.width());
            if (this.viewMode() === CListViewMode.IconMode && (rect.y() + rect.height() <= this.scrollY()
                || rect.y() >= this.scrollY() + this.viewport().height())) continue;
            const y = rect.y();

			const selected = this.#m_selectedRows.has(row);
			const hovered = (row === this.#m_hoveredRow);

			/** Provides if behavior. */
			if (selected || hovered) {
				/** Provides if behavior. */
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

	/**
	 * Responds to a key press for the list widget. May accept or ignore the event depending on the input. May emit `itemActivated`, `itemClicked`.
	 * @param event Event for a key press.
	 */
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
                row = next;
                const direction = next < this.#m_currentRow ? -1 : 1;
                while (row >= 0 && row < this.count() && !this.#isSelectableRow(row) && next !== this.#m_currentRow) {
                    const candidate = this.#m_itemLayout.navigate(row, event.key(), this.count(), this.#m_contentWidget.width(), this.viewport().height());
                    if (candidate === null || candidate === row || (direction < 0 ? candidate > row : candidate < row)) { row = this.#m_currentRow; break; }
                    row = candidate;
                }
            }
            if (this.#isSelectableRow(row)) this.setCurrentRow(row);
            this.#ensureCurrentVisible(); event.accept(); return;
        }

		/** Provides switch behavior. */
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

				/** Provides if behavior. */
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
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		let row = this.#m_currentRow;

		/** Provides if behavior. */
		if (row === -1)
			row = direction === 1
				? -1
				: this.#m_items.length;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			row = (
				row +
				direction +
				this.#m_items.length
			) % this.#m_items.length;

			/** Provides if behavior. */
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
		/** Provides for behavior. */
		for (let row = 0; row < this.#m_items.length; ++row) {
			/** Provides if behavior. */
			if (this.#isSelectableRow(row))
				return row;
		}

		return -1;
	}

	#lastSelectableRow(): number
	{
		/** Provides for behavior. */
		for (
			let row = this.#m_items.length - 1;
			row >= 0;
			--row
		) {
			/** Provides if behavior. */
			if (this.#isSelectableRow(row))
				return row;
		}

		return -1;
	}

	#nearestSelectableRow(row: number): number
	{
		/** Provides if behavior. */
		if (row < 0)
			return -1;

		/** Provides for behavior. */
		for (let i = row; i < this.#m_items.length; ++i) {
			/** Provides if behavior. */
			if (this.#isSelectableRow(i))
				return i;
		}

		/** Provides for behavior. */
		for (let i = row - 1; i >= 0; --i) {
			/** Provides if behavior. */
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
