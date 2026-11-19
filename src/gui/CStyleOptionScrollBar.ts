/** @module GUI/CStyleOptionScrollBar */
import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CScrollBar } from "../widgets/CScrollBar.js";

/**
 * Contains style information used to render a scroll bar.
 */
export class CStyleOptionScrollBar extends CStyleOption {
    /**
    * Axis along which the style lays out and paints this control.
    */
    orientation = COrientation.Horizontal;
    /**
    * Logical pixel extent reserved for each arrow button along the scrolling axis.
    */
    buttonSize = 0;
    /**
    * Start coordinate of the draggable track along the scrolling axis, in widget-local pixels.
    */
    trackStart = 0;
    /**
    * Logical pixel length of the draggable track along the scrolling axis.
    */
    trackLength = 0;
    /**
    * Start coordinate of the scroll thumb along the scrolling axis, in widget-local pixels.
    */
    thumbStart = 0;
    /**
    * Logical pixel extent of the scroll thumb along the scrolling axis.
    */
    thumbLength = 0;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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