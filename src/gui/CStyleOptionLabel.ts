import { CStyleOption } from "./CStyleOption.js";
import { CAlignment } from "../core/CAlignment.js";
import type { CPixmap } from "../painting/CPixmap.js";
import type { CLabel } from "../widgets/CLabel.js";

export class CStyleOptionLabel extends CStyleOption {
	text = "";
	alignment = CAlignment.Left | CAlignment.VCenter;
	pixmap: CPixmap | null = null;

	constructor(other: CStyleOptionLabel | null = null) {
		super(other);

		if (other) {
			this.text = other.text;
			this.alignment = other.alignment;
			this.pixmap = other.pixmap;
		}
	}

	initFromLabel(label: CLabel): void {
		this.initFrom(label);

		this.text = label.text();
		this.alignment = label.alignment();
		this.pixmap = label.pixmap();
	}
}