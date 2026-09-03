import { CPopupWidget } from "./CPopupWidget.js";
import { CAction } from "../core/CAction.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CSignal } from "../core/CSignal.js";
import type { CMenuBar } from "./CMenuBar.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

type CMenuItem =
	| { type: "action"; action: CAction }
	| { type: "menu"; text: string; menu: CMenu }
	| { type: "separator" };

export class CMenu extends CPopupWidget {
	static readonly ItemHeight = 28;
	static readonly SeparatorHeight = 9;
	static readonly HorizontalPadding = 12;
	static readonly CheckColumnWidth = 20;

	#m_items: CMenuItem[] = [];
	#m_hoveredIndex = -1;
    #m_openSubMenu: CMenu | null = null;
    #m_parentMenu: CMenu | null = null;
	#m_menuBar: CMenuBar | null = null;

    readonly closed = new CSignal<[]>();

	constructor() {
		super();
		this.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

	addAction(action: CAction): CAction {
		this.#m_items.push({ type: "action", action });
		this.#updateGeometry();

		return action;
	}

	addMenu(text: string, menu: CMenu): CMenu {
        menu.#m_parentMenu = this;
		this.#m_items.push({ type: "menu", text, menu });
		this.#updateGeometry();

		return menu;
	}

	addSeparator(): void {
		this.#m_items.push({ type: "separator" });
		this.#updateGeometry();
	}

	clear(): void {
		this.#m_items = [];
		this.#m_hoveredIndex = -1;
		this.#updateGeometry();
	}

	count(): number {
		return this.#m_items.length;
	}

	actionAt(index: number): CAction | null {
		const item = this.#m_items[index];

		if (item === undefined || item.type !== "action")
			return null;

		return item.action;
	}

	menuAt(index: number): CMenu | null {
		const item = this.#m_items[index];

		if (item === undefined || item.type !== "menu")
			return null;

		return item.menu;
	}

	setMenuBar(menuBar: CMenuBar | null): void
	{
		this.#m_menuBar = menuBar;
	}

	override open(): void
	{
		super.open();

		if (!this.#isSelectableItem(this.#m_hoveredIndex))
			this.selectFirstItem();
		this.#updateSubMenu();
	}

	override close(): void {
        if (!this.isOpen())
            return;

		this.#closeSubMenu();
		super.close();
        this.closed.emit();

		const parent: CMenu | null = this.#m_parentMenu;
		if (parent !== null && parent.isOpen())
			parent.setFocus();
	}

    currentIndex(): number {
		return this.#m_hoveredIndex;
	}

	selectFirstItem(): void
	{
		for (let i = 0; i < this.#m_items.length; ++i) {
			if (this.#isSelectableItem(i)) {
				this.#setCurrentIndex(i);
				return;
			}
		}
	}

	focusOpenSubMenu(): boolean
	{
		if (this.#m_openSubMenu === null)
			return false;

		this.#m_openSubMenu.setFocus();
		return true;
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const index = this.#itemIndexAt(event.y());

		if (index !== this.#m_hoveredIndex) {
			this.#m_hoveredIndex = index;
			this.#updateSubMenu();
			this.update();
		}
		event.accept();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		if (this.#m_hoveredIndex !== -1) {
			this.#m_hoveredIndex = -1;
			this.update();
		}

		event.accept();
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		const index = this.#itemIndexAt(event.y());

		if (index === -1) {
			event.ignore();
			return;
		}

		const item = this.#m_items[index]!;

		if (item.type === "separator") {
			event.accept();
			return;
		}

		if (item.type === "menu") {
			event.accept();
			return;
		}

		if (!item.action.isEnabled()) {
			event.accept();
			return;
		}

		item.action.trigger();
		this.#closeMenuChain();

		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		switch (event.key()) {
			case "ArrowRight":
				if (this.#m_parentMenu !== null)
					this.#enterSubMenu();
				else if (this.#m_menuBar !== null)
					this.#m_menuBar.selectMenu(1);

				event.accept();
				break;

			case "ArrowLeft":
				if (this.#m_parentMenu !== null)
					this.#closeToParentMenu();
				else if (this.#m_menuBar !== null)
					this.#m_menuBar.selectMenu(-1);

				event.accept();
				break;

			case "ArrowDown":
				this.#selectNextItem();
				event.accept();
				break;

			case "ArrowUp":
				this.#selectPreviousItem();
				event.accept();
				break;

			case "Enter":
				this.#activateCurrentItem();
				event.accept();
				break;

			default:
				event.ignore();
				break;
		}
	}

	protected override paintEvent(painter: CPainter): void {
		painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
		painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
		painter.drawRect(0, 0, this.width(), this.height());
		painter.setFont(this.font());
        
		let y = 0;

		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;

			if (item.type === "separator") {
				const separatorY = y + CMenu.SeparatorHeight / 2;

				painter.drawLine(
					CMenu.HorizontalPadding, separatorY,
					this.width() - CMenu.HorizontalPadding, separatorY
				);

				y += CMenu.SeparatorHeight;
				continue;
			}

			const enabled = item.type === "action"
				? item.action.isEnabled() : true;
            const clr = (i === this.#m_hoveredIndex && enabled)? 
                this.palette().color(CPaletteColorRole.HighlightedText) : 
                    this.palette().color(CPaletteColorRole.Text);
                 

            if (i === this.#m_hoveredIndex && enabled) {
				painter.setBrush(this.palette().color(CPaletteColorRole.Highlight).toCss());
				painter.drawRect(1, y, this.width() - 2, CMenu.ItemHeight);
            }

			if (item.type === "action") {
                const size = CMenu.ItemHeight / 2;
                const x = CMenu.HorizontalPadding;
                if (item.action.isCheckable()) {
                    painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
                    painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
                    painter.drawRect(x, y + CMenu.ItemHeight / 4, size, size);
                }
                if (item.action.isChecked()) {
                    painter.setBrush(this.palette().color(CPaletteColorRole.Highlight).toCss());
                    painter.setPen(this.palette().color(CPaletteColorRole.Highlight).toCss());
                    painter.drawRect(x + 3, y + CMenu.ItemHeight / 4 + 3, size - 6, size - 6);
				}

                painter.setPen(clr.toCss());
				painter.drawText(item.action.text(), CMenu.HorizontalPadding + CMenu.CheckColumnWidth, y + 3 * CMenu.ItemHeight / 4);
			} else {
                painter.setPen(clr.toCss());
				painter.drawText(item.text, CMenu.HorizontalPadding + CMenu.CheckColumnWidth, y + 3 * CMenu.ItemHeight / 4);
				painter.drawText("▶", this.width() - CMenu.HorizontalPadding - 8, y + 3 * CMenu.ItemHeight / 4);
			}

			y += CMenu.ItemHeight;
		}
	}

	#itemIndexAt(y: number): number {
		let top = 0;

		for (let i = 0; i < this.#m_items.length; ++i) {
			const item = this.#m_items[i]!;
			const height = item.type === "separator"
				? CMenu.SeparatorHeight : CMenu.ItemHeight;

			if (y >= top && y < top + height)
				return i;

			top += height;
		}

		return -1;
	}

	#updateGeometry(): void {
		let height = 0;
		let width = 120;

		for (const item of this.#m_items) {
			if (item.type === "separator") {
				height += CMenu.SeparatorHeight;
				continue;
			}

			height += CMenu.ItemHeight;

			const text = item.type === "action"
				? item.action.text() : item.text;

			const submenuWidth = item.type === "menu" ? 20 : 0;

			width = Math.max(
				width,
				text.length * 8 +
				CMenu.CheckColumnWidth +
				CMenu.HorizontalPadding * 2 +
				submenuWidth
			);
		}

		this.resize(width, height);
	}

    #itemY(index: number): number {
		let y = 0;

		for (let i = 0; i < index; ++i) {
			y += this.#m_items[i]!.type === "separator"
				? CMenu.SeparatorHeight
				: CMenu.ItemHeight;
		}

		return y;
	}

	#updateSubMenu(): void {
		const item = this.#m_items[this.#m_hoveredIndex];

		if (item === undefined || item.type !== "menu") {
			this.#closeSubMenu();
			return;
		}

		if (this.#m_openSubMenu === item.menu)
			return;

		this.#closeSubMenu();

		const itemY = this.#itemY(this.#m_hoveredIndex);

		item.menu.move(
			this.x() + this.width(),
			this.y() + itemY
		);

		item.menu.open();
		this.#m_openSubMenu = item.menu;
	}

	#closeSubMenu(): void {
		if (this.#m_openSubMenu === null)
			return;

		this.#m_openSubMenu.close();
		this.#m_openSubMenu = null;
	}

	#closeMenuChain(): void {
		let menu: CMenu | null = this;

		while (menu !== null) {
            const parent: CMenu | null = menu.#m_parentMenu;

			menu.close();
			menu = parent;
		}
	}

	#selectNextItem(): void {
		if (this.#m_items.length === 0)
			return;

		let index = this.#m_hoveredIndex;

		for (let i = 0; i < this.#m_items.length; ++i) {
			index = (index + 1) % this.#m_items.length;

			if (this.#isSelectableItem(index)) {
				this.#setCurrentIndex(index);
				return;
			}
		}
	}

	#selectPreviousItem(): void {
		if (this.#m_items.length === 0)
			return;

		let index = this.#m_hoveredIndex;

		if (index === -1)
			index = 0;

		for (let i = 0; i < this.#m_items.length; ++i) {
			index = (index - 1 + this.#m_items.length) %
				this.#m_items.length;

			if (this.#isSelectableItem(index)) {
				this.#setCurrentIndex(index);
				return;
			}
		}
	}

	#isSelectableItem(index: number): boolean {
		const item = this.#m_items[index];

		if (item === undefined || item.type === "separator")
			return false;

		if (item.type === "action")
			return item.action.isEnabled();

		return true;
	}

	#setCurrentIndex(index: number): void {
		if (index === this.#m_hoveredIndex)
			return;

		this.#m_hoveredIndex = index;
		this.#updateSubMenu();
		this.update();
	}

	#activateCurrentItem(): void {
		const item = this.#m_items[this.#m_hoveredIndex];

		if (item === undefined || item.type !== "action")
			return;

		if (!item.action.isEnabled())
			return;

		item.action.trigger();
		this.#closeMenuChain();
	}

	#closeToParentMenu(): void {
		if (this.#m_parentMenu === null)
			return;

		const parent = this.#m_parentMenu;

		this.close();
		parent.setFocus();
	}

	#enterSubMenu(): void {
		const item = this.#m_items[this.#m_hoveredIndex];

		if (item === undefined || item.type !== "menu")
			return;

		this.#updateSubMenu();

		item.menu.setFocus();
		item.menu.#selectNextItem();
	}
}