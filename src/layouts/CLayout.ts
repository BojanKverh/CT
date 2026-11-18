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

	/**
	 * Looks up the widget whose contents this layout manages.
	 * @returns The assigned widget, or `null` if the layout is unattached.
	 */
	parentWidget(): CWidget | null {
		return this.#m_parentWidget;
	}

	/**
	 * Assigns the managed widget and reparents all represented widgets to it when it is present.
	 * @param widget New parent widget, or `null` to clear the layout's parent reference.
	 */
	setParentWidget(widget: CWidget | null): void {
		this.#m_parentWidget = widget;

		if (widget !== null) {
			for (const item of this.#m_items)
				item.widget()?.setParent(widget);
		}
	}

	/**
	 * Appends a widget item unless the widget is already managed by this layout.
	 * @param widget Widget to add.
	 */
	addWidget(widget: CWidget): void {
		this.addItem(new CWidgetItem(widget));
	}

    /**
     * Changes the alignment of a directly managed widget and updates the layout if the flags change.
     * @param widget Widget to align.
     * @param alignment Axis alignment flags, or `0` to use size-policy-driven filling.
     * @returns `true` if the widget is directly managed.
     */
    setAlignment(widget: CWidget, alignment: CAlignment | 0): boolean {
        const item = this.#m_items.find(item => item.widget() === widget);
        if (!item) return false;
        if (item.alignment() !== alignment) {
            item.setAlignment(alignment);
            this.update();
        }
        return true;
    }

	/**
	 * Appends an empty layout item with a stretch weight.
	 * @param stretch Stretch weight. Negative values are clamped to zero.
	 */
	addStretch(stretch: number): void {
		this.addItem(new CBoxLayoutItem(null, stretch));
	}

	/**
	 * Counts the items managed by the layout.
	 * @returns Number of items, including spacers.
	 */
	count(): number {
		return this.#m_items.length;
	}

	/**
	 * Looks up the widget represented by an item.
	 * @param index Zero-based item index.
	 * @returns The represented widget, or `null` if the index is absent or the item has no widget.
	 */
	widgetAt(index: number): CWidget | null {
		return this.#m_items[index]?.widget() ?? null;
	}

	/**
	 * Removes the specified widget's layout item and updates geometry. The widget retains its parent.
	 * @param widget Widget to stop managing.
	 */
	removeWidget(widget: CWidget): void {
		const index = this.#indexOf(widget);

		if (index === -1)
			return;

		this.#m_items.splice(index, 1);
		this.update();
	}

	/**
	 * Reads the layout's base spacing.
	 * @returns Spacing between items in logical pixels.
	 */
	spacing(): number {
		return this.#m_spacing;
	}

	/**
	 * Changes the layout's base spacing and updates geometry if it changed.
	 * @param spacing New spacing in logical pixels.
	 */
	setSpacing(spacing: number): void {
		if (this.#m_spacing === spacing)
			return;

		this.#m_spacing = spacing;
		this.update();
	}

	/**
	 * Reads the insets around the layout contents.
	 * @returns An independent copy of the four margins in logical pixels.
	 */
	contentsMargins(): CMargins {
		return { ...this.#m_margins };
	}

	/**
	 * Changes the layout insets and updates geometry if they changed.
	 * @param left Left inset in logical pixels.
	 * @param top Top inset in logical pixels.
	 * @param right Right inset in logical pixels.
	 * @param bottom Bottom inset in logical pixels.
	 */
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

	/** Removes every layout item and recalculates geometry. Represented widgets retain their parents. */
	clear(): void {
		this.#m_items.length = 0;
		this.update();
	}

	/**
	 * Appends an item through the usual insertion path.
	 * @param item Layout item to append.
	 * @returns `true` if inserted or `false` for a duplicate item or widget.
	 */
	protected addItem(item: CLayoutItem): boolean {
		return this.insertItem(this.#m_items.length, item);
	}

	/**
	 * Inserts an item, reparents its widget when a parent is assigned and updates the layout.
	 * @param index Zero-based insertion position, clamped to the current item range. The count appends.
	 * @param item Item to insert.
	 * @returns `true` if inserted or `false` for a duplicate item or widget.
	 */
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

	/**
	 * Looks up a layout item by position.
	 * @param index Zero-based item index.
	 * @returns The item at that index, or `null` if absent.
	 */
	protected itemAt(index: number): CLayoutItem | null {
		return this.#m_items[index] ?? null;
	}

	/**
	 * Exposes the current items in layout order.
	 * @returns A read-only view of the internal item array.
	 */
	protected items(): readonly CLayoutItem[] {
		return this.#m_items;
	}

	#indexOf(widget: CWidget): number {
		return this.#m_items.findIndex(
			item => item.widget() === widget
		);
	}

    /**
     * Checks whether any managed widget reports a width-dependent preferred height.
     * @returns `true` if at least one managed widget has height-for-width.
     */
    hasHeightForWidth(): boolean {
        return this.items().some(item => item.widget()?.hasHeightForWidth() === true);
    }

    /**
     * Provides the subclass hook for computing preferred height at an allocated width.
     * @param _width Available layout width in logical pixels. The base implementation ignores it.
     * @returns The preferred height in a supporting subclass. The base implementation returns `-1`.
     */
    heightForWidth(_width: number): number { return -1; }

	/**
	 * Computes the preferred size of the arranged contents.
	 * @returns The preferred layout size in logical pixels.
	 */
	abstract sizeHint(): CSize;
	/** Recalculates and applies the geometry of managed items. */
	abstract update(): void;

	/**
	 * Computes usable sizing bounds from a widget's policy, constraints and preferred size. The policy may pin either bound to the preferred size.
	 * @param widget Widget to measure.
	 * @param horizontal `true` for width or `false` for height.
	 * @param geometryFallback Whether to use current geometry when the applicable size hint is nonpositive. Defaults to `false`.
	 * @param width Optional allocated width for a vertical height-for-width measurement.
	 * @returns Minimum, preferred and maximum size along the selected axis.
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

    /**
     * Computes the axis bounds for a widget or an empty item using its size policy.
     * @param item Item to measure.
     * @param horizontal `true` for width or `false` for height.
     * @param width Optional allocated width for measuring a widget's preferred height.
     * @returns Minimum, preferred and maximum size along the selected axis.
     */
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
     * Selects only the alignment flags applicable to the requested axis.
     * @param item Item whose alignment is inspected.
     * @param horizontal `true` for horizontal flags or `false` for vertical flags.
     * @returns The masked alignment flags, or zero.
     */
    protected static itemAxisAlignment(item: CLayoutItem, horizontal: boolean): number {
        return item.alignment() & (horizontal
            ? CAlignment.Left | CAlignment.Right | CAlignment.HCenter
            : CAlignment.Top | CAlignment.Bottom | CAlignment.VCenter);
    }

    /**
     * Computes the width an item will receive in a cell, using its alignment and policy bounds.
     * @param item Item to measure.
     * @param available Cell width in logical pixels.
     * @returns Item width in logical pixels, which may exceed the cell when its minimum requires it.
     */
    protected static itemWidth(item: CLayoutItem, available: number): number {
        const bounds = CLayout.layoutItemAxisBounds(item, true);
        return Math.min(bounds.maximum, Math.max(bounds.minimum,
            CLayout.itemAxisAlignment(item, true) ? Math.min(available, bounds.preferred) : available));
    }

    /**
     * Fits an item within the allocated cell using axis constraints and aligns it within any remaining space.
     * @param item Item to position.
     * @param x Cell's left edge in parent coordinates.
     * @param y Cell's top edge in parent coordinates.
     * @param width Cell width in logical pixels.
     * @param height Cell height in logical pixels.
     */
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

	/**
	 * Allocates space along one axis. Below the preferred total, shrinks proportionally toward each minimum. Above it, distributes surplus by priority and weight up to each maximum.
	 * @param available Total space in logical pixels.
	 * @param minimums Minimum size for each item, returned as a copy if space runs out.
	 * @param preferred Preferred size for each item.
	 * @param maximums Maximum size for each item.
	 * @param weights Growth weights in item order. Zero excludes an item from growth.
	 * @param priorities Growth priorities in item order. Processes 3, then 2, then 1.
	 * @returns The allocated sizes in the original item order.
	 */
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
