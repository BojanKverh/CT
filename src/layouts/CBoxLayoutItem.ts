/** @module Layouts/CBoxLayoutItem */
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

    /** Returns the item's stretch factor. */
    stretch(): number {
		return this.#m_stretch;
	}

    /**
    * Sets the item's stretch factor.
    *
    * Negative values are clamped to zero.
    */
    setStretch(stretch: number): void {
		this.#m_stretch = Math.max(0, stretch);
	}
}
