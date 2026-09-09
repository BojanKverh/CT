import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";

export class CStyleOptionScrollBar extends CStyleOption {
	orientation = COrientation.Horizontal;
	buttonSize = 0;
	trackStart = 0;
	trackLength = 0;
	thumbStart = 0;
	thumbLength = 0;

	constructor(other: CStyleOptionScrollBar | null = null) {
		super(other);

		if (other === null)
			return;

		this.orientation = other.orientation;
		this.buttonSize = other.buttonSize;
		this.trackStart = other.trackStart;
		this.trackLength = other.trackLength;
		this.thumbStart = other.thumbStart;
		this.thumbLength = other.thumbLength;
	}

	initFromScrollBar(scrollBar: CScrollBar): void {
		this.initFrom(scrollBar);

		this.orientation = scrollBar.orientation();
		this.buttonSize = scrollBar.buttonSize();
		this.trackStart = scrollBar.trackStart();
		this.trackLength = scrollBar.trackLength();
		this.thumbStart = scrollBar.thumbStart();
		this.thumbLength = scrollBar.thumbLength();
	}
}