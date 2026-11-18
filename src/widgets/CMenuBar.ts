import { CWidget } from "./CWidget.js";
import { CMenu } from "./CMenu.js";
import { CRect } from "../geometry/CRect.js";
import { CPoint } from "../geometry/CPoint.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CSize } from "../geometry/CSize.js";

type CMenuBarItem =
	| { type: "menu"; text: string; menu: CMenu }
	| { type: "separator" };

/** Implements the menu bar widget. */
export class CMenuBar extends CWidget
{
	static readonly DefaultHeight = 28;
	static readonly HorizontalPadding = 10;
	static readonly ItemSpacing = 4;

	#m_items: CMenuBarItem[] = [];
	#m_hoveredIndex = -1;
	#m_openMenu: CMenu | null = null;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		this.resize(this.width(), CMenuBar.DefaultHeight);
	}

	/**
	 * Adds a menu entry and restores focus to the menu bar when its active popup closes.
	 * @param text Caption displayed on the menu bar.
	 * @param menu Menu to open for the entry.
	 * @returns The same menu instance.
	 */
	addMenu(text: string, menu: CMenu): CMenu
	{
		menu.setMenuBar(this);
		this.#m_items.push({type: "menu", text, menu});

		menu.closed.connect(() => {
			/** Provides if behavior. */
			if (this.#m_openMenu !== menu)
				return;

			this.#m_openMenu = null;
			this.setFocus();
			this.update();
		});
		this.update();
		return menu;
	}

	/** Adds separator. */
	addSeparator(): void
	{
		this.#m_items.push({ type: "separator" });
		this.update();
	}

	/** Clears the current contents. */
	clear(): void
	{
		/** Provides if behavior. */
		if (this.#m_openMenu !== null) {
			this.#m_openMenu.close();
			this.#m_openMenu = null;
		}

		this.#m_items = [];
		this.#m_hoveredIndex = -1;

		this.update();
	}

	/**
	 * Counts the entries in the menu bar.
	 * @returns The number of entries in the items.
	 */
	count(): number
	{
		return this.#m_items.length;
	}

	/**
	 * Looks up a menu among the menu bar's entries.
	 * @param index Zero-based entry index, including action entries.
	 * @returns The menu, or `null` if the entry is absent or is an action.
	 */
	menuAt(index: number): CMenu | null
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined || item.type !== "menu")
			return null;

		return item.menu;
	}

	/**
	 * Selects the menu.
	 * @param direction Direction.
	 */
	selectMenu(direction: 1 | -1): void
	{
		this.#selectMenu(direction);
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
		return new CSize(0, CMenuBar.DefaultHeight);
	}

    /**
     * Responds to pointer movement for the menu bar. May accept the event.
     * @param event Event for pointer movement.
     */
    protected override mouseMoveEvent(event: CMouseEvent): void
	{
		const index = this.#itemIndexAt(event.x(), event.y());

		this.#setCurrentIndex(index);

		event.accept();
	}

	/**
	 * Responds to pointer exit for the menu bar. May update the hovered index. May request a repaint and accept the event.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (this.#m_openMenu === null) {
			this.#m_hoveredIndex = -1;
			this.update();
		}

		event.accept();
	}

	/**
	 * Responds to a pointer button press for the menu bar. May update the open menu, the hovered index. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void
	{
		const index = this.#itemIndexAt(event.x(), event.y());

		/** Provides if behavior. */
		if (index === -1) {
			event.ignore();
			return;
		}

		const item = this.#m_items[index]!;

		/** Provides if behavior. */
		if (item.type !== "menu") {
			event.ignore();
			return;
		}

		const rect = this.#itemRect(index);

		/** Provides if behavior. */
		if (rect === null) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (this.#m_openMenu === item.menu) {
			item.menu.close();
			this.#m_openMenu = null;
			this.update();
			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (this.#m_openMenu !== null)
			this.#m_openMenu.close();

        const x = this.#menuPositionX(rect, item.menu);
		item.menu.move(x, this.y() + this.height());

		item.menu.open();

		this.#m_openMenu = item.menu;
		this.#m_hoveredIndex = index;
		this.#m_openMenu.setFocus();
		
		this.update();
		event.accept();
	}

	/**
	 * Responds to a key press for the menu bar. May accept or ignore the event depending on the input.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void
	{
		/** Provides switch behavior. */
		switch (event.key()) {
			case "ArrowRight":
				this.#selectMenu(1);
				event.accept();
				break;

			case "ArrowLeft":
				this.#selectMenu(-1);
				event.accept();
				break;

			case "ArrowDown":
				this.#openCurrentMenu();
				event.accept();
				break;

			default:
				event.ignore();
				break;
		}
	}

	/**
	 * Draws the menu bar through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void
	{
		painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));
		painter.setFont(this.font());

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;

			/** Provides if behavior. */
			if (item.type === "separator")
				continue;

			const rect = this.#itemRect(i);

			/** Provides if behavior. */
			if (rect === null)
				continue;

			/** Provides if behavior. */
			if (i === this.#m_hoveredIndex) {
				painter.setBrush(this.palette().color(CPaletteColorRole.Highlight).toCss());
				painter.fillRect(rect);
				painter.setPen(this.palette().color(CPaletteColorRole.HighlightedText).toCss());
			} else {
				painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
			}

			painter.drawText(
				item.text,
				rect.x() + CMenuBar.HorizontalPadding,
				3 * this.height() / 4
			);
		}
	}

	#selectMenu(direction: 1 | -1): void
	{
		/** Provides if behavior. */
		if (this.#m_items.length === 0)
			return;

		let index = this.#m_hoveredIndex;

		/** Provides if behavior. */
		if (index === -1 && direction === -1)
			index = 0;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			index = (
				index + direction + this.#m_items.length
			) % this.#m_items.length;

			/** Provides if behavior. */
			if (this.#m_items[index]?.type === "menu") {
				this.#setCurrentIndex(index);
				return;
			}
		}
	}

	#itemWidth(item: CMenuBarItem): number
	{
		/** Provides if behavior. */
		if (item.type === "separator")
			return 0;

		return item.text.length * 8 + 2 * CMenuBar.HorizontalPadding;
	}

	#separatorIndex(): number
	{
		return this.#m_items.findIndex(item => item.type === "separator");
	}

	#itemRect(index: number): CRect | null
	{
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_items.length)
			return null;

		const item = this.#m_items[index]!;

		/** Provides if behavior. */
		if (item.type === "separator")
			return null;

		const separatorIndex = this.#separatorIndex();

		/** Provides if behavior. */
		if (separatorIndex === -1 || index < separatorIndex)
			return this.#leftItemRect(index);

		return this.#rightItemRect(index);
	}

	#leftItemRect(index: number): CRect
	{
		let x = 0;

		/** Provides for behavior. */
		for (let i = 0; i < index; ++i) {
			const item = this.#m_items[i]!;

			/** Provides if behavior. */
			if (item.type !== "menu")
				continue;

			x += this.#itemWidth(item) + CMenuBar.ItemSpacing;
		}

		const item = this.#m_items[index]!;

		return new CRect(x, 0, this.#itemWidth(item), this.height());
	}

	#rightItemRect(index: number): CRect
	{
		let x = this.width();

		/** Provides for behavior. */
		for (let i = this.#m_items.length - 1; i >= index; --i) {
			const item = this.#m_items[i]!;

			/** Provides if behavior. */
			if (item.type !== "menu")
				continue;

			x -= this.#itemWidth(item);

			/** Provides if behavior. */
			if (i !== index)
				x -= CMenuBar.ItemSpacing;
		}

		const item = this.#m_items[index]!;

		return new CRect(x, 0, this.#itemWidth(item), this.height());
	}

	#itemIndexAt(x: number, y: number): number
	{
		/** Provides if behavior. */
		if (y < 0 || y >= this.height())
			return -1;

		const point = new CPoint(x, y);

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_items.length; ++i) {
			const rect = this.#itemRect(i);

			/** Provides if behavior. */
			if (rect !== null && rect.contains(point))
				return i;
		}

		return -1;
	}

    #menuPositionX(rect: CRect, menu: CMenu): number
    {
	    let x = this.x() + rect.x();
	    const right = x + menu.width();
	    const menuBarRight = this.x() + this.width();
	    /** Provides if behavior. */
	    if (right > menuBarRight)
		    x = menuBarRight - menu.width();
	    return x;
    }

	#setCurrentIndex(index: number): void
	{
		/** Provides if behavior. */
		if (index === this.#m_hoveredIndex)
			return;

		this.#m_hoveredIndex = index;

		/** Provides if behavior. */
		if (this.#m_openMenu !== null)
			this.#switchOpenMenu(index);

		this.update();
	}

	#openCurrentMenu(): void
	{
		const item = this.#m_items[this.#m_hoveredIndex];
		/** Provides if behavior. */
		if (item === undefined || item.type !== "menu")
			return;

		/** Provides if behavior. */
		if (!item.menu.isOpen()) {
			const rect = this.#itemRect(this.#m_hoveredIndex);
			/** Provides if behavior. */
			if (rect === null)
				return;

			const x = this.#menuPositionX(rect, item.menu);
			item.menu.move(x, this.y() + this.height());
			item.menu.open();
			this.#m_openMenu = item.menu;
		}

		/** Provides if behavior. */
		if (!item.menu.focusOpenSubMenu())
			item.menu.setFocus();
	}

	#switchOpenMenu(index: number): void
	{
		const item = this.#m_items[index];

		/** Provides if behavior. */
		if (item === undefined || item.type !== "menu")
			return;

		const rect = this.#itemRect(index);

		/** Provides if behavior. */
		if (rect === null)
			return;

		this.#m_openMenu?.close();

		const x = this.#menuPositionX(rect, item.menu);

		item.menu.move(x, this.y() + this.height());
		item.menu.open();

		this.#m_openMenu = item.menu;
		/** Provides if behavior. */
		if (!item.menu.focusOpenSubMenu())
			item.menu.setFocus();
	}
}