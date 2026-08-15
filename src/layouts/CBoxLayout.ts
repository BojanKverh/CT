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

		let totalStretch = 0;

		for (let i = 0; i < count; ++i) {
			const item = this.itemAt(i) as CBoxLayoutItem | null;

			if (item !== null)
				totalStretch += this.#effectiveStretch(item);
		}

		const spacing = this.spacing();
		const totalSpacing = spacing * (count - 1);
		const margins = this.contentsMargins();

		if (this.#m_direction === CBoxLayoutDirection.LeftToRight) {
			const availableWidth = parent.width()
				- margins.left - margins.right - totalSpacing;

			let x = margins.left;

			for (let i = 0; i < count; ++i) {
				const item = this.itemAt(i) as CBoxLayoutItem | null;

				if (item === null)
					continue;

				const widget = item.widget();
				const stretch = this.#effectiveStretch(item);
				const width = availableWidth * stretch / totalStretch;

				widget.setGeometry(
					x, margins.top, width,
					parent.height() - margins.top - margins.bottom
				);

				x += width + spacing;
			}
		} else {
			const availableHeight = parent.height()
				- margins.top - margins.bottom - totalSpacing;

			let y = margins.top;

			for (let i = 0; i < count; ++i) {
				const item = this.itemAt(i) as CBoxLayoutItem | null;

				if (item === null)
					continue;

				const widget = item.widget();
				const stretch = this.#effectiveStretch(item);
				const height = availableHeight * stretch / totalStretch;

				widget.setGeometry(
					margins.left, y,
					parent.width() - margins.left - margins.right,
					height
				);

				y += height + spacing;
			}
		}
	}

	#effectiveStretch(item: CBoxLayoutItem): number {
		return item.stretch() > 0 ? item.stretch() : 1;
	}
}
