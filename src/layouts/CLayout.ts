import type { CWidget } from "../widgets/CWidget.js";
import { CWidgetItem } from "./CWidgetItem.js";
import type { CLayoutItem } from "./CLayoutItem.js";
import { CBoxLayoutItem } from "./CBoxLayoutItem.js";

export interface CMargins {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export abstract class CLayout {
	#m_parentWidget: CWidget | null = null;
	#m_items: CLayoutItem[] = [];
	#m_spacing = 0;

	#m_margins: CMargins = {
		left: 0,
		top: 0,
		right: 0,
		bottom: 0
	};

	parentWidget(): CWidget | null {
		return this.#m_parentWidget;
	}

	setParentWidget(widget: CWidget | null): void {
		this.#m_parentWidget = widget;

		if (widget !== null) {
			for (const item of this.#m_items)
				item.widget()?.setParent(widget);
		}
	}

    addWidget(widget: CWidget): void {
	    this.addItem(new CWidgetItem(widget));
    }

	addStretch(stretch: number): void {
		this.addItem(new CBoxLayoutItem(null, stretch));
	}

	count(): number {
		return this.#m_items.length;
	}

	widgetAt(index: number): CWidget | null {
		return this.#m_items[index]?.widget() ?? null;
	}

	spacing(): number {
		return this.#m_spacing;
	}

	setSpacing(spacing: number): void {
		if (this.#m_spacing === spacing)
			return;

		this.#m_spacing = spacing;
		this.update();
	}

	contentsMargins(): CMargins {
		return { ...this.#m_margins };
	}

	setContentsMargins(left: number, top: number,
		right: number, bottom: number): void {
		if (
			this.#m_margins.left === left
			&& this.#m_margins.top === top
			&& this.#m_margins.right === right
			&& this.#m_margins.bottom === bottom
		)
			return;

		this.#m_margins = {
			left,
			top,
			right,
			bottom
		};

		this.update();
	}

	clear()
	{
		this.#m_items.length = 0;
		this.update();
	}

	protected addItem(item: CLayoutItem): boolean {
		const widget = item.widget();

		if (widget !== null && this.#indexOf(widget) !== -1)
			return false;

		this.#m_items.push(item);

		if (widget !== null && this.#m_parentWidget !== null)
			widget.setParent(this.#m_parentWidget);

		this.update();
		return true;
	}

	protected itemAt(index: number): CLayoutItem | null {
		return this.#m_items[index] ?? null;
	}

	protected items(): readonly CLayoutItem[] {
		return this.#m_items;
	}

	#indexOf(widget: CWidget): number {
		return this.#m_items.findIndex(
			item => item.widget() === widget
		);
	}

	abstract update(): void;
}
