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

	/** Returns the layout direction. */
	direction(): CBoxLayoutDirection {
		return this.#m_direction;
	}

	/** Adds a widget with an optional stretch factor. */
	override addWidget(widget: CWidget, stretch = 0): void {
		this.addItem(new CBoxLayoutItem(widget, stretch));
	}

	/** Adds all widgets from another layout with an optional stretch factor. */
	addLayout(layout: CLayout, stretch = 0): void {
		const widget = new CWidget();
		widget.setLayout(layout);
		this.addWidget(widget, stretch);
	}

	/** Returns the preferred size required by the arranged items. */
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
			if (widget === null)
				continue;

			const minimum = widget.minimumSize();
			const maximum = widget.maximumSize();
			const hint = widget.sizeHint();

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

	/** Recalculates and applies item geometries. */
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

	#mainMaximum(widget: CWidget): number {
		return this.#m_direction === CBoxLayoutDirection.LeftToRight
			? widget.maximumSize().width() : widget.maximumSize().height();
	}

	#mainSizeHint(widget: CWidget): number {
		return this.#m_direction === CBoxLayoutDirection.LeftToRight
			? widget.sizeHint().width() : widget.sizeHint().height();
	}

	#crossSize(widget: CWidget, available: number): number {
		const minimum = widget.minimumSize();
		const maximum = widget.maximumSize();

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
			return Math.min(
				maximum.height(),
				Math.max(available, minimum.height())
			);
		}

		return Math.min(
			maximum.width(),
			Math.max(available, minimum.width())
		);
	}

	#calculateSizes(available: number): number[] {
		const count = this.count();

		const minimums: number[] = [];
		const preferred: number[] = [];
		const maximums: number[] = [];
		const stretches: number[] = [];

		let totalMinimum = 0;
		let totalPreferred = 0;

		const hasSpacer = this.#hasStretchSpacer();

		for (let i = 0; i < count; ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem;
			const widget = item.widget();

			const minimum = widget !== null
				? this.#mainMinimum(widget) : 0;
			const maximum = widget !== null
				? this.#mainMaximum(widget) : Number.MAX_SAFE_INTEGER;
			const hint = widget !== null
				? this.#mainSizeHint(widget) : 0;
			const preferredSize = Math.min(
				maximum,
				Math.max(minimum, hint)
			);

			let stretch = item.stretch();

			if (widget !== null && stretch === 0)
				stretch = hasSpacer ? 0 : 1;

			minimums.push(minimum);
			preferred.push(preferredSize);
			maximums.push(maximum);
			stretches.push(stretch);

			totalMinimum += minimum;
			totalPreferred += preferredSize;
		}

		if (available >= totalPreferred) {
			const sizes = [...preferred];
			let extra = available - totalPreferred;

			while (extra > 0) {
				let totalStretch = 0;

				for (let i = 0; i < count; ++i) {
					if (
						stretches[i]! > 0
						&& sizes[i]! < maximums[i]!
					)
						totalStretch += stretches[i]!;
				}

				if (totalStretch === 0)
					break;

				let distributed = 0;

				for (let i = 0; i < count; ++i) {
					const stretch = stretches[i]!;

					if (
						stretch === 0
						|| sizes[i]! >= maximums[i]!
					)
						continue;

					const share = extra * stretch / totalStretch;
					const amount = Math.min(
						share,
						maximums[i]! - sizes[i]!
					);

					sizes[i]! += amount;
					distributed += amount;
				}

				if (distributed <= 0)
					break;

				extra -= distributed;
			}

			return sizes;
		}

		if (available >= totalMinimum) {
			const shrink = totalPreferred - available;
			const capacities = preferred.map((size, index) =>
				size - minimums[index]!);
			const totalCapacity = capacities.reduce(
				(sum, value) => sum + value,
				0
			);

			if (totalCapacity === 0)
				return [...minimums];

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
