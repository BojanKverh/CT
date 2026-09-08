import { CRect } from "../geometry/CRect.js";
import { CPalette } from "./CPalette.js";
import type { CWidget } from "../widgets/CWidget.js";

export enum CStyleState {
	None = 0,
	Enabled = 1 << 0,
	Active = 1 << 1,
	MouseOver = 1 << 2,
	Sunken = 1 << 3,
	On = 1 << 4,
	HasFocus = 1 << 5,
	Selected = 1 << 6
}

export class CStyleOption {
	rect = new CRect();
	state = CStyleState.None;
	palette = new CPalette();
    font = "";

	constructor(other: CStyleOption | null = null) {
		if (other === null)
			return;

		this.rect = new CRect(
			other.rect.x(), other.rect.y(),
			other.rect.width(), other.rect.height()
		);
		this.state = other.state;
		this.palette = new CPalette(other.palette);
       	this.font = other.font;
	}

    initFrom(widget: CWidget): void {
		this.rect = widget.rect();
		this.palette = widget.palette();

		this.state = CStyleState.None;

		if (widget.isEnabled())
			this.state |= CStyleState.Enabled;

		if (widget.hasFocus())
			this.state |= CStyleState.HasFocus;

        this.font = widget.font();
	}
}