/** @module GUI/CStyleOptionToolTipWidget */
import { CStyleOption } from "./CStyleOption.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";

/**
 * Contains style information used to render a tool tip widget.
 */
export class CStyleOptionToolTipWidget extends CStyleOption {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionToolTipWidget | null = null) {
		super(other);

		if (other)
			this.text = other.text;
	}

    /**
    * Initializes this style option from the specified tool tip.
    *
    * @param toolTip Tool tip.
    */
    initFromToolTip(toolTip: CToolTipWidget): void {
		this.initFrom(toolTip);
		this.text = toolTip.text();
	}
}