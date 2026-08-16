import { CLayout } from "./CLayout.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CBoxLayoutItem } from "./CBoxLayoutItem.js";

export enum CBoxLayoutDirection {
	LeftToRight,
	TopToBottom
}

export class CBoxLayout extends CLayout {
	#m_direction: CBoxLayoutDirection;

	constructor(direction: CBoxLayoutDirection) {
		super();

		this.#m_direction = direction;
	}

	direction(): CBoxLayoutDirection {
		return this.#m_direction;
	}

	override addWidget(widget: CWidget, stretch = 0): void {
		this.addItem(new CBoxLayoutItem(widget, stretch));
	}

	override update(): void {
		const parent = this.parentWidget();

		if (parent === null)
			return;

		const count = this.count();

		if (count === 0)
			return;

		const spacing = this.spacing();
		const margins = this.contentsMargins();
		const totalSpacing = spacing * (count - 1);

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
			const available = parent.width()
				- margins.left - margins.right - totalSpacing;

			const sizes = this.#calculateSizes(available);
			const crossAvailable =
				parent.height() - margins.top - margins.bottom;

			let x = margins.left;

			for (let i = 0; i < count; ++i) {
				const widget = this.widgetAt(i);

				if (widget === null)
					continue;

				const width = sizes[i]!;
				const height = this.#crossSize(
					widget, crossAvailable
				);

				widget.setGeometry(
					x, margins.top, width, height
				);

				x += width + spacing;
			}
		} else {
			const available = parent.height()
				- margins.top - margins.bottom - totalSpacing;

			const sizes = this.#calculateSizes(available);
			const crossAvailable =
				parent.width() - margins.left - margins.right;

			let y = margins.top;

			for (let i = 0; i < count; ++i) {
				const widget = this.widgetAt(i);

				if (widget === null)
					continue;

				const width = this.#crossSize(
					widget, crossAvailable
				);
				const height = sizes[i]!;

				widget.setGeometry(
					margins.left, y, width, height
				);

				y += height + spacing;
			}
		}
	}
    
	#mainMinimum(widget: CWidget): number {
		if (this.#m_direction === CBoxLayoutDirection.LeftToRight)
			return widget.minimumSize().width();
        else 
		    return widget.minimumSize().height();
	}

	#mainSizeHint(widget: CWidget): number {
		if (this.#m_direction === CBoxLayoutDirection.LeftToRight)
			return widget.sizeHint().width();
        else 
		    return widget.sizeHint().height();
	}

	#crossSize(widget: CWidget, available: number): number {
		const minimum = widget.minimumSize();

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight)
			return Math.max(available, minimum.height());

		return Math.max(available, minimum.width());
	}

	#effectiveStretch(item: CBoxLayoutItem): number {
		return item.stretch() > 0 ? item.stretch() : 1;
	}

    	#calculateSizes(available: number): number[] {
		const count = this.count();

		const minimums: number[] = [];
		const preferred: number[] = [];
		const stretches: number[] = [];

		let totalMinimum = 0;
		let totalPreferred = 0;
		let totalStretch = 0;

		for (let i = 0; i < count; ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem;
			const widget = item.widget();

			const minimum = this.#mainMinimum(widget);
			const hint = this.#mainSizeHint(widget);
			const preferredSize = Math.max(minimum, hint);
			const stretch = this.#effectiveStretch(item);

			minimums.push(minimum);
			preferred.push(preferredSize);
			stretches.push(stretch);

			totalMinimum += minimum;
			totalPreferred += preferredSize;
			totalStretch += stretch;
		}

		if (available >= totalPreferred) {
			const extra = available - totalPreferred;

			return preferred.map((size, index) =>
				size + extra * stretches[index]! / totalStretch
			);
		}

		if (available >= totalMinimum) {
			const shrink = totalPreferred - available;
			const capacities = preferred.map(
				(size, index) => size - minimums[index]!
			);

			const totalCapacity = capacities.reduce(
				(sum, value) => sum + value, 0
			);

			if (totalCapacity === 0)
				return [...minimums];

			return preferred.map((size, index) =>
				size - shrink * capacities[index]! / totalCapacity
			);
		}

		return [...minimums];
	}
}
