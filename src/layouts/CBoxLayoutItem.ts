import type { CWidget } from "../widgets/CWidget.js";
import { CWidgetItem } from "./CWidgetItem.js";

/**
 * Layout item used by box layouts, with an associated stretch factor.
 */
export class CBoxLayoutItem extends CWidgetItem {
	#m_stretch: number;

	/**
	 * Creates a box-layout item.
	 *
	 * @param widget Widget represented by the item, or `null` for a stretch.
	 * @param stretch Non-negative stretch factor.
	 */
	constructor(widget: CWidget | null, stretch = 0) {
		super(widget);

		this.#m_stretch = Math.max(0, stretch);
	}

	/**
	 * Reads the item's main-axis stretch weight.
	 * @returns The stored stretch weight.
	 */
	stretch(): number {
		return this.#m_stretch;
	}

	/**
	 * Changes this item's stretch weight for future layout calculations.
	 * @param stretch Requested weight. Negative values are clamped to zero.
	 */
	setStretch(stretch: number): void {
		this.#m_stretch = Math.max(0, stretch);
	}
}
