import type { CWidget } from "../widgets/CWidget.js";

export interface CMargins {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export abstract class CLayout {
	#m_parentWidget: CWidget | null = null;
	#m_widgets: CWidget[] = [];
	#m_spacing = 0;

    #m_margins: CMargins = { left: 0, top: 0, right: 0, bottom: 0 };

	parentWidget(): CWidget | null {
		return this.#m_parentWidget;
	}

    setParentWidget(widget: CWidget | null): void {
	    this.#m_parentWidget = widget;

	    if (widget !== null) {
		    for (const child of this.#m_widgets)
			    child.setParent(widget);
	    }
    }

	addWidget(widget: CWidget): void {
		if (this.#m_widgets.includes(widget))
			return;

		this.#m_widgets.push(widget);

		if (this.#m_parentWidget !== null)
			widget.setParent(this.#m_parentWidget);

		this.update();
	}

	count(): number {
		return this.#m_widgets.length;
	}

	widgetAt(index: number): CWidget | null {
		return this.#m_widgets[index] ?? null;
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

    protected widgets(): readonly CWidget[] {
		return this.#m_widgets;
	}

	abstract update(): void;
}