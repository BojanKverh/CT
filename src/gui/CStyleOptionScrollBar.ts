import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";

/**
 * Contains style information used to render a scroll bar.
 */
export class CStyleOptionScrollBar extends CStyleOption {
		/**
	 * Returns or updates the orientation value.
	 */
orientation = COrientation.Horizontal;
		/**
	 * Returns the button size used by the style.
	 */
buttonSize = 0;
		/**
	 * Returns or updates the track start value.
	 */
trackStart = 0;
		/**
	 * Returns or updates the track length value.
	 */
trackLength = 0;
		/**
	 * Returns or updates the thumb start value.
	 */
thumbStart = 0;
		/**
	 * Returns or updates the thumb length value.
	 */
thumbLength = 0;

		/**
	 * Creates a new CStyleOptionScrollBar instance.
	 *
	 * @param other Other.
	 */
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

		/**
	 * Initializes this style option from the specified scroll bar.
	 *
	 * @param scrollBar Scroll bar.
	 */
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