import type { CWidget } from "../widgets/CWidget.js";
import { CWidgetItem } from "./CWidgetItem.js";

export class CBoxLayoutItem extends CWidgetItem {
	#m_stretch: number;

	constructor(widget: CWidget, stretch = 0) {
		super(widget);

		this.#m_stretch = Math.max(0, stretch);
	}

	stretch(): number {
		return this.#m_stretch;
	}

	setStretch(stretch: number): void {
		this.#m_stretch = Math.max(0, stretch);
	}
}