import { CStyleOption } from "./CStyleOption.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";

export class CStyleOptionToolTipWidget extends CStyleOption {
	text = "";

	constructor(other: CStyleOptionToolTipWidget | null = null) {
		super(other);

		if (other)
			this.text = other.text;
	}

	initFromToolTip(toolTip: CToolTipWidget): void {
		this.initFrom(toolTip);
		this.text = toolTip.text();
	}
}