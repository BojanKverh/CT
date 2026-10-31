import { CSizePolicy } from "../geometry/CSizePolicy.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CWidgetItem } from "./CWidgetItem.js";
import type { CLayoutItem } from "./CLayoutItem.js";
import { CBoxLayoutItem } from "./CBoxLayoutItem.js";
import { CSize } from "../geometry/CSize.js";

interface CLayoutAxisBounds { minimum: number; preferred: number; maximum: number; }

/**
 * Margins around a layout's contents, in pixels.
 */
export interface CMargins {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/**
 * Abstract base class for geometry managers that arrange child widgets.
 *
 * A layout owns an ordered collection of layout items and provides common
 * spacing, content-margin and parent-widget management.
 */
export abstract class CLayout {
	#m_parentWidget: CWidget | null = null;
	#m_items: CLayoutItem[] = [];
	#m_spacing = 6;

	#m_margins: CMargins = {
		left: 6,
		top: 6,
		right: 6,
		bottom: 6
	};

	/** Returns the widget managed by this layout, or `null` if none is set. */
	parentWidget(): CWidget | null {
		return this.#m_parentWidget;
	}

	/** Sets the widget managed by this layout and reparents contained widgets. */
	setParentWidget(widget: CWidget | null): void {
		this.#m_parentWidget = widget;

		if (widget !== null) {
			for (const item of this.#m_items)
				item.widget()?.setParent(widget);
		}
	}

	/** Adds a widget to the layout. */
	addWidget(widget: CWidget): void {
		this.addItem(new CWidgetItem(widget));
	}

	/** Adds an empty stretch item with the specified stretch factor. */
	addStretch(stretch: number): void {
		this.addItem(new CBoxLayoutItem(null, stretch));
	}

	/** Returns the number of items in the layout. */
	count(): number {
		return this.#m_items.length;
	}

	/** Returns the widget at the specified item index, or `null`. */
	widgetAt(index: number): CWidget | null {
		return this.#m_items[index]?.widget() ?? null;
	}

	/** Removes the specified widget from the layout. */
	removeWidget(widget: CWidget): void {
		const index = this.#indexOf(widget);

		if (index === -1)
			return;

		this.#m_items.splice(index, 1);
		this.update();
	}

	/** Returns the spacing between layout items in pixels. */
	spacing(): number {
		return this.#m_spacing;
	}

	/** Sets the spacing between layout items in pixels. */
	setSpacing(spacing: number): void {
		if (this.#m_spacing === spacing)
			return;

		this.#m_spacing = spacing;
		this.update();
	}

	/** Returns a copy of the layout's content margins. */
	contentsMargins(): CMargins {
		return { ...this.#m_margins };
	}

	/** Sets the content margins in pixels. */
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

	/** Removes all items from the layout. */
	clear(): void {
		this.#m_items.length = 0;
		this.update();
	}

	/** Adds a layout item and returns whether it was accepted. */
	protected addItem(item: CLayoutItem): boolean {
		return this.insertItem(this.#m_items.length, item);
	}

	/** Inserts a layout item and returns whether it was accepted. */
	protected insertItem(index: number, item: CLayoutItem): boolean {
		const widget = item.widget();

		if (widget !== null && this.#indexOf(widget) !== -1)
			return false;

		index = Math.max(0, Math.min(index, this.#m_items.length));
		this.#m_items.splice(index, 0, item);

		if (widget !== null && this.#m_parentWidget !== null)
			widget.setParent(this.#m_parentWidget);

		this.update();
		return true;
	}

	/** Returns the layout item at the specified index, or `null`. */
	protected itemAt(index: number): CLayoutItem | null {
		return this.#m_items[index] ?? null;
	}

	/** Returns the layout items as a read-only array. */
	protected items(): readonly CLayoutItem[] {
		return this.#m_items;
	}

	#indexOf(widget: CWidget): number {
		return this.#m_items.findIndex(
			item => item.widget() === widget
		);
	}

    /** Whether any managed widget has a width-dependent preferred height. */
    hasHeightForWidth(): boolean {
        return this.items().some(item => item.widget()?.hasHeightForWidth() === true);
    }

    /** Layouts with width-dependent geometry override this calculation. */
    heightForWidth(_width: number): number { return -1; }

	/** Returns the preferred size required by the layout. */
	abstract sizeHint(): CSize;
	/** Recalculates and applies the geometry of managed widgets. */
	abstract update(): void;

	protected static layoutAxisBounds(widget: CWidget, horizontal: boolean, geometryFallback = false, width?: number): CLayoutAxisBounds {
	    const policy = widget.sizePolicy();
	    const axis = horizontal ? policy.horizontalPolicy() : policy.verticalPolicy();
	    const minimum = horizontal ? widget.minimumWidth() : widget.minimumHeight();
	    const maximum = horizontal ? widget.maximumWidth() : widget.maximumHeight();
	    const hint = widget.sizeHint();
	    let preferred = horizontal ? hint.width() : hint.height();
        if (!horizontal && width !== undefined && widget.hasHeightForWidth()) {
            const height = widget.heightForWidth(Math.max(0, width));
            if (Number.isFinite(height) && height >= 0) preferred = height;
        }
	    if (CSizePolicy.ignoresHint(axis)) preferred = 0;
	    else if (geometryFallback && preferred <= 0) preferred = horizontal ? widget.width() : widget.height();
	    preferred = Math.min(maximum, Math.max(minimum, preferred));
	    return { minimum: CSizePolicy.canShrink(axis) ? minimum : preferred, preferred,
	        maximum: CSizePolicy.canGrow(axis) ? maximum : preferred };
	}

	/** Internal bounded allocation; larger priorities receive extra space first. */
	protected static layoutAxisSizes(available: number, minimums: number[], preferred: number[], maximums: number[],
	    weights: number[], priorities: number[]): number[] {
	    const totalMinimum = minimums.reduce((a, b) => a + b, 0);
	    const totalPreferred = preferred.reduce((a, b) => a + b, 0);
	    if (available <= totalMinimum) return [...minimums];
	    if (available < totalPreferred) {
	        return preferred.map((size, i) => size - (totalPreferred - available)
	            * (size - minimums[i]!) / (totalPreferred - totalMinimum));
	    }
	    const sizes = [...preferred];
	    let extra = available - totalPreferred;
	    for (const priority of [3, 2, 1]) {
	        while (extra > 1e-9) {
	            const active = sizes.map((_, i) => i).filter(i => priorities[i] === priority
	                && weights[i]! > 0 && sizes[i]! < maximums[i]! - 1e-9);
	            if (active.length === 0) break;
	            const totalWeight = active.reduce((sum, i) => sum + weights[i]!, 0);
	            let distributed = 0;
	            for (const i of active) {
	                const amount = Math.min(extra * weights[i]! / totalWeight, maximums[i]! - sizes[i]!);
	                sizes[i]! += amount; distributed += amount;
	            }
	            if (distributed <= 1e-9) break;
	            extra -= distributed;
	        }
	    }
	    return sizes;
	}
}
