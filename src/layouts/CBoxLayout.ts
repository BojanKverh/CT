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

				if (widget !== null) {
					const height = this.#crossSize(widget, crossAvailable);
					widget.setGeometry(x, contentY, width, height);
				}

				x += width + spacing;
			}
		} else {
			const available = Math.max(0, contentHeight - totalSpacing);
			const sizes = this.#calculateSizes(available);
			const crossAvailable = contentWidth;

			let y = contentY;

			for (let i = 0; i < count; ++i) {
				const item = this.itemAt(i) as CBoxLayoutItem;
				const widget = item.widget();
				const height = sizes[i]!;

				if (widget !== null) {
					const width = this.#crossSize(widget, crossAvailable);
					widget.setGeometry(contentX, y, width, height);
				}

				y += height + spacing;
			}
		}
	}

	#mainMinimum(widget: CWidget): number {
		return this.#m_direction === CBoxLayoutDirection.LeftToRight
			? widget.minimumSize().width() : widget.minimumSize().height();
	}

	#mainSizeHint(widget: CWidget): number {
		return this.#m_direction === CBoxLayoutDirection.LeftToRight
			? widget.sizeHint().width() : widget.sizeHint().height();
	}

	#crossSize(widget: CWidget, available: number): number {
		const minimum = widget.minimumSize();

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight)
			return Math.max(available, minimum.height());

		return Math.max(available, minimum.width());
	}

	#calculateSizes(available: number): number[] {
		const count = this.count();

		const minimums: number[] = [];
		const preferred: number[] = [];
		const stretches: number[] = [];

		let totalMinimum = 0;
		let totalPreferred = 0;
		let totalStretch = 0;

		const hasSpacer = this.#hasStretchSpacer();

		for (let i = 0; i < count; ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem;
			const widget = item.widget();

			const minimum = widget !== null ? this.#mainMinimum(widget) : 0;
			const hint = widget !== null ? this.#mainSizeHint(widget) : 0;
			const preferredSize = Math.max(minimum, hint);

			let stretch = item.stretch();

			if (widget !== null && stretch === 0)
				stretch = hasSpacer ? 0 : 1;

			minimums.push(minimum);
			preferred.push(preferredSize);
			stretches.push(stretch);

			totalMinimum += minimum;
			totalPreferred += preferredSize;
			totalStretch += stretch;
		}

		if (available >= totalPreferred) {
			const extra = available - totalPreferred;

			if (totalStretch === 0)
				return [...preferred];

			return preferred.map((size, index) =>
				size + extra * stretches[index]! / totalStretch);
		}

		if (available >= totalMinimum) {
			const shrink = totalPreferred - available;
			const capacities = preferred.map((size, index) =>
				size - minimums[index]!);
			const totalCapacity = capacities.reduce((sum, value) => sum + value, 0);

			if (totalCapacity === 0) {
				if (totalStretch === 0)
					return [...minimums];

				return stretches.map(stretch =>
					available * stretch / totalStretch);
			}

			return preferred.map((size, index) =>
				size - shrink * capacities[index]! / totalCapacity);
		}

		return [...minimums];
	}

	#hasStretchSpacer(): boolean {
		for (let i = 0; i < this.count(); ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem;

			if (item.widget() === null && item.stretch() > 0)
				return true;
		}

		return false;
	}
}
