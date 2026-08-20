import { CPopupWidget } from "./CPopupWidget.js";
import { CAction } from "../core/CAction.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

type CMenuItem =
	| { type: "action"; action: CAction }
	| { type: "separator" };

export class CMenu extends CPopupWidget {
	static readonly ItemHeight = 28;
	static readonly SeparatorHeight = 9;
	static readonly HorizontalPadding = 12;
    static readonly CheckColumnWidth = 20;

	#m_items: CMenuItem[] = [];
	#m_hoveredIndex = -1;

	addAction(action: CAction): CAction {
		this.#m_items.push({ type: "action", action });
		this.#updateGeometry();

		return action;
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

	protected override mouseMoveEvent(event: CMouseEvent): void {
		const index = this.#itemIndexAt(event.y());

		if (index !== this.#m_hoveredIndex) {
			this.#m_hoveredIndex = index;
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

		if (item.type !== "action" || !item.action.isEnabled()) {
			event.accept();
			return;
		}

		item.action.trigger();
		this.close();

		event.accept();
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

            if (item.action.isChecked()) {
				painter.setPen("#202020");
				painter.drawText("✓", CMenu.HorizontalPadding, y + 3 * CMenu.ItemHeight / 4);
			}

			if (i === this.#m_hoveredIndex && item.action.isEnabled()) {
				painter.setBrush(this.palette().color(CPaletteColorRole.Highlight).toCss());
				painter.drawRect(1, y, this.width() - 2, CMenu.ItemHeight);
                painter.setPen(this.palette().color(CPaletteColorRole.HighlightedText).toCss());
			}   else {
                painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
            }

			painter.drawText(
				item.action.text(),
				CMenu.HorizontalPadding + CMenu.CheckColumnWidth,
				y + 3 * CMenu.ItemHeight / 4
			);

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
			height += item.type === "separator"
				? CMenu.SeparatorHeight : CMenu.ItemHeight;

			if (item.type === "action")
				width = Math.max(width, item.action.text().length * 8 + 24);
		}

		this.resize(width, height);
	}
}