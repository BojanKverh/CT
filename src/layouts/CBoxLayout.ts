import { CAlignment } from "../core/CAlignment.js";
import { CSpacerItem } from "./CSpacerItem.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CSizePolicy } from "../geometry/CSizePolicy.js";
import { CLayout } from "./CLayout.js";
import { CWidget } from "../widgets/CWidget.js";
import { CBoxLayoutItem } from "./CBoxLayoutItem.js";
import { CSize } from "../geometry/CSize.js";

/**
 * Direction in which a box layout arranges its items.
 */
export enum CBoxLayoutDirection {
	/** Arrange items horizontally from left to right. */
	LeftToRight,
	/** Arrange items vertically from top to bottom. */
	TopToBottom
}

/**
 * Layout that arranges widgets and stretches in a single row or column.
 */
export class CBoxLayout extends CLayout {
	#m_direction: CBoxLayoutDirection;

	/** Creates a box layout using the specified direction. */
	constructor(direction: CBoxLayoutDirection) {
		super();
		this.#m_direction = direction;
	}

	/**
	 * Reads how this box arranges items.
	 * @returns Left-to-right or top-to-bottom direction.
	 */
	direction(): CBoxLayoutDirection {
		return this.#m_direction;
	}

	/**
	 * Appends a widget with optional sizing controls for its allocated cell.
	 * @param widget Widget to add.
	 * @param stretch Main-axis stretch weight. Defaults to zero and is clamped to zero if negative.
	 * @param alignment Axis alignment flags. Defaults to zero for size-policy-driven filling.
	 */
	override addWidget(widget: CWidget, stretch = 0, alignment: CAlignment | 0 = 0): void {
        const item = new CBoxLayoutItem(widget, stretch);
        item.setAlignment(alignment);
        this.addItem(item);
	}

    /**
     * Appends an empty item with its own preferred size and sizing policies.
     * @param spacer Spacer item to add.
     */
    addSpacerItem(spacer: CSpacerItem): void { this.addItem(spacer); }

    /**
     * Appends a spacer with a fixed main-axis size and zero preferred cross-axis size.
     * @param size Gap in logical pixels. Negative or nonfinite values become zero.
     */
    addSpacing(size: number): void {
        const horizontal = this.#m_direction === CBoxLayoutDirection.LeftToRight;
        this.addSpacerItem(new CSpacerItem(horizontal ? size : 0, horizontal ? 0 : size,
            horizontal ? CSizePolicyType.Fixed : CSizePolicyType.Minimum,
            horizontal ? CSizePolicyType.Minimum : CSizePolicyType.Fixed));
    }

	/**
	 * Attaches the nested layout to a new wrapper widget and inserts the wrapper into this box.
	 * @param layout Layout to nest.
	 * @param stretch Stretch weight of the wrapper. Defaults to zero.
	 * @param alignment Alignment flags for the wrapper. Defaults to zero.
	 */
	addLayout(layout: CLayout, stretch = 0, alignment: CAlignment | 0 = 0): void {
		const widget = new CWidget();
		widget.setLayout(layout);
		this.addWidget(widget, stretch, alignment);
	}

	/**
	 * Combines item hints and bounds along the box axes, including margins and spacing. Pure stretch slots contribute no preferred size.
	 * @returns A new preferred size, or a zero size when there are no items.
	 */
	override sizeHint(): CSize {
		const count = this.count();
		if (count === 0)
			return new CSize();
		const margins = this.contentsMargins();
		const spacing = this.spacing();
		let main = 0;
		let cross = 0;
		let widgetCount = 0;

		for (let i = 0; i < count; ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem;
			const widget = item.widget();
			if (widget === null && !(item instanceof CSpacerItem))
				continue;

			const minimum = item.minimumSize();
			const maximum = item.maximumSize();
            const originalHint = item.sizeHint();
            const policy = item.sizePolicy();
            const hint = new CSize(
                CSizePolicy.ignoresHint(policy.horizontalPolicy()) ? 0 : originalHint.width(),
                CSizePolicy.ignoresHint(policy.verticalPolicy()) ? 0 : originalHint.height());

			if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
				main += Math.min(
					maximum.width(),
					Math.max(minimum.width(), hint.width())
				);
				cross = Math.max(
					cross,
					Math.min(
						maximum.height(),
						Math.max(minimum.height(), hint.height())
					)
				);
			} else {
				main += Math.min(
					maximum.height(),
					Math.max(minimum.height(), hint.height())
				);
				cross = Math.max(
					cross,
					Math.min(
						maximum.width(),
						Math.max(minimum.width(), hint.width())
					)
				);
			}

			++widgetCount;
		}

		if (widgetCount > 1)
			main += (widgetCount - 1) * spacing;

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
			return new CSize(main + margins.left + margins.right, cross + margins.top + margins.bottom);
		}	else {
			return new CSize(cross + margins.left + margins.right, main + margins.top + margins.bottom);
		}
	}

    /**
     * Computes preferred height after determining the widths available to the items.
     * @param width Available width including horizontal margins, in logical pixels.
     * @returns Preferred height including vertical margins, or `-1` when no widget has height-for-width.
     */
    override heightForWidth(width: number): number {
        if (!this.hasHeightForWidth()) return -1;
        const margins = this.contentsMargins();
        const contentWidth = Math.max(0, width - margins.left - margins.right);
        const spacing = Math.max(0, this.count() - 1) * this.spacing();
        let height = 0;
        if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
            const widths = this.#calculateSizes(Math.max(0, contentWidth - spacing));
            for (let i = 0; i < this.count(); ++i) {
                const widget = this.itemAt(i)?.widget();
                const item = this.itemAt(i)!;
                if (widget || item instanceof CSpacerItem) height = Math.max(height,
                    CLayout.layoutItemAxisBounds(item, false, CLayout.itemWidth(item, widths[i]!)).preferred);
            }
        } else {
            for (const item of this.items()) {
                const widget = item.widget();
                if (widget) height += this.#bounds(widget, false, CLayout.itemWidth(item, contentWidth)).preferred;
                else if (item instanceof CSpacerItem) height += CLayout.layoutItemAxisBounds(item, false).preferred;
            }
            height += spacing;
        }
        return height + margins.top + margins.bottom;
    }

	/** Allocates space along the box direction and applies item geometry using the parent widget's contents. With no parent, geometry is left as-is. */
	override update(): void {
		const parent = this.parentWidget();

		if (parent === null)
			return;

		const count = this.count();

		if (count === 0)
			return;

		const spacing = this.spacing();
		const margins = this.contentsMargins();
		const contentsRect = parent.contentsRect();
		const totalSpacing = spacing * (count - 1);

		const contentX = contentsRect.x() + margins.left;
		const contentY = contentsRect.y() + margins.top;
		const contentWidth = Math.max(
			0,
			contentsRect.width() - margins.left - margins.right
		);
		const contentHeight = Math.max(
			0,
			contentsRect.height() - margins.top - margins.bottom
		);

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
			const available = Math.max(0, contentWidth - totalSpacing);
			const sizes = this.#calculateSizes(available);
			const crossAvailable = contentHeight;

			let x = contentX;

			for (let i = 0; i < count; ++i) {
				const item = this.itemAt(i) as CBoxLayoutItem;
				const widget = item.widget();
				const width = sizes[i]!;

                if (widget !== null || item instanceof CSpacerItem)
                    CLayout.setAlignedItemGeometry(item, x, contentY, width, crossAvailable);

				x += width + spacing;
			}
		} else {
			const available = Math.max(0, contentHeight - totalSpacing);
			const sizes = this.#calculateSizes(available, contentWidth);
			const crossAvailable = contentWidth;

			let y = contentY;

			for (let i = 0; i < count; ++i) {
				const item = this.itemAt(i) as CBoxLayoutItem;
				const widget = item.widget();
				const height = sizes[i]!;

                if (widget !== null || item instanceof CSpacerItem)
                    CLayout.setAlignedItemGeometry(item, contentX, y, crossAvailable, height);

				y += height + spacing;
			}
		}
	}

    #bounds(widget: CWidget, horizontal: boolean, width?: number): { minimum: number; preferred: number; maximum: number } {
        return CLayout.layoutAxisBounds(widget, horizontal, false, width);
    }

    #calculateSizes(available: number, width?: number): number[] {
        const minimums: number[] = [], preferred: number[] = [], maximums: number[] = [];
        const weights: number[] = [], priorities: number[] = [];
        const horizontal = this.#m_direction === CBoxLayoutDirection.LeftToRight;
        const hasSpacer = this.#hasStretchSpacer();
        const hasExpanding = this.items().some(item => {
            const policy = item.sizePolicy();
            const axis = horizontal ? policy?.horizontalPolicy() : policy?.verticalPolicy();
            return axis !== undefined && CSizePolicy.isExpanding(axis);
        });
        for (let i = 0; i < this.count(); ++i) {
            const item = this.itemAt(i) as CBoxLayoutItem;
            const widget = item.widget();
            const bounds = item instanceof CSpacerItem ? CLayout.layoutItemAxisBounds(item, horizontal)
                : widget === null ? { minimum: 0, preferred: 0, maximum: Number.MAX_SAFE_INTEGER }
                : this.#bounds(widget, horizontal, width === undefined ? undefined : CLayout.itemWidth(item, width));
            const policy = item instanceof CSpacerItem ? item.sizePolicy() : widget?.sizePolicy();
            const axisPolicy = horizontal ? policy?.horizontalPolicy() : policy?.verticalPolicy();
            const stretch = item.stretch() || (horizontal ? policy?.horizontalStretch() : policy?.verticalStretch()) || 0;
            minimums.push(bounds.minimum); preferred.push(bounds.preferred); maximums.push(CLayout.itemAxisAlignment(item, horizontal) ? Number.MAX_SAFE_INTEGER : bounds.maximum);
            weights.push(stretch || 1);
            priorities.push(stretch > 0 ? 3
                : axisPolicy !== undefined && CSizePolicy.isExpanding(axisPolicy) ? 2 : hasSpacer ? 0 : hasExpanding ? 1 : 3);
        }
        const totalPreferred = preferred.reduce((a, b) => a + b, 0);
        const totalMinimum = minimums.reduce((a, b) => a + b, 0);
        if (available >= totalPreferred) {
            const sizes = [...preferred];
            let extra = available - totalPreferred;
            // Prefer expanding policies while retaining legacy stretch ratios when none expand.
            for (const priority of [3, 2, 1]) {
                while (extra > 1e-9) {
                    const active = sizes.map((_, i) => i).filter(i =>
                        priorities[i] === priority && sizes[i]! < maximums[i]! - 1e-9);
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
        if (available <= totalMinimum) return minimums;
        const capacity = totalPreferred - totalMinimum;
        return preferred.map((size, i) => size - (totalPreferred - available) * (size - minimums[i]!) / capacity);
    }

    #hasStretchSpacer(): boolean {
        for (let i = 0; i < this.count(); ++i) {
            const item = this.itemAt(i) as CBoxLayoutItem;
            if (item.widget() === null && item.stretch() > 0) return true;
            if (item instanceof CSpacerItem) {
                const policy = item.sizePolicy();
                if (CSizePolicy.isExpanding(this.#m_direction === CBoxLayoutDirection.LeftToRight
                    ? policy.horizontalPolicy() : policy.verticalPolicy())) return true;
            }
        }
        return false;
    }
}
