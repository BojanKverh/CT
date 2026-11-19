/** @module Layouts/CLayout */
import { CAlignment } from "../core/CAlignment.js";
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
    /**
    * Logical pixels reserved between the left edge and content.
    */
    left: number;
    /**
    * Logical pixels reserved between the top edge and content.
    */
    top: number;
    /**
    * Logical pixels reserved between the right edge and content.
    */
    right: number;
    /**
    * Logical pixels reserved between the bottom edge and content.
    */
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

    /** Sets alignment for a directly managed widget; returns false when not found. */
    setAlignment(widget: CWidget, alignment: CAlignment | 0): boolean {
        const item = this.#m_items.find(item => item.widget() === widget);
        if (!item) return false;
        if (item.alignment() !== alignment) {
            item.setAlignment(alignment);
            this.update();
        }
        return true;
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

    /**
    * Logical gap between neighboring items.
    * The initial value is `6`.
    */
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

        if (this.#m_items.includes(item)) return false;
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

    /**
    * Calculates an item's minimum, preferred and maximum extent along one allocation axis.
    */
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

    /** Axis constraints for widget items and non-widget spacer items. */
    protected static layoutItemAxisBounds(item: CLayoutItem, horizontal: boolean, width?: number): CLayoutAxisBounds {
        const widget = item.widget();
        if (widget !== null) return CLayout.layoutAxisBounds(widget, horizontal, false, width);
        const policy = item.sizePolicy();
        const axis = horizontal ? policy.horizontalPolicy() : policy.verticalPolicy();
        const hint = item.sizeHint(), min = item.minimumSize(), max = item.maximumSize();
        const minimum = horizontal ? min.width() : min.height();
        const maximum = horizontal ? max.width() : max.height();
        const preferred = Math.min(maximum, Math.max(minimum, CSizePolicy.ignoresHint(axis) ? 0
            : horizontal ? hint.width() : hint.height()));
        return { minimum: CSizePolicy.canShrink(axis) ? minimum : preferred, preferred,
            maximum: CSizePolicy.canGrow(axis) ? maximum : preferred };
    }

    /**
    * Extracts alignment flags relevant to one allocation axis.
    */
    protected static itemAxisAlignment(item: CLayoutItem, horizontal: boolean): number {
        return item.alignment() & (horizontal
            ? CAlignment.Left | CAlignment.Right | CAlignment.HCenter
            : CAlignment.Top | CAlignment.Bottom | CAlignment.VCenter);
    }

    /** Actual width within an allocated cell, respecting alignment and policy bounds. */
    protected static itemWidth(item: CLayoutItem, available: number): number {
        const bounds = CLayout.layoutItemAxisBounds(item, true);
        return Math.min(bounds.maximum, Math.max(bounds.minimum,
            CLayout.itemAxisAlignment(item, true) ? Math.min(available, bounds.preferred) : available));
    }

    /** Places the item inside a cell; flags only constrain their respective axis. */
    protected static setAlignedItemGeometry(item: CLayoutItem, x: number, y: number, width: number, height: number): void {
        const actualWidth = CLayout.itemWidth(item, width);
        const vertical = CLayout.layoutItemAxisBounds(item, false, actualWidth);
        const actualHeight = Math.min(vertical.maximum, Math.max(vertical.minimum,
            CLayout.itemAxisAlignment(item, false) ? Math.min(height, vertical.preferred) : height));
        const alignment = item.alignment();
        const dx = Math.max(0, width - actualWidth), dy = Math.max(0, height - actualHeight);
        x += (alignment & CAlignment.Right) ? dx : (alignment & CAlignment.HCenter) ? dx / 2 : 0;
        y += (alignment & CAlignment.Bottom) ? dy : (alignment & CAlignment.VCenter) ? dy / 2 : 0;
        item.setGeometry(x, y, actualWidth, actualHeight);
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
