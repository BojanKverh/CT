/** @module GUI/CStyleOptionFrame */
import { CStyleOption } from "./CStyleOption.js";
import { CFrameShape, CFrameShadow } from "./CFrameStyle.js";
import type { CFrame } from "../widgets/CFrame.js";

/**
 * Contains style information used to render a frame.
 */
export class CStyleOptionFrame extends CStyleOption {
    /**
    * Outline geometry chosen from CFrameShape, such as a box or panel.
    */
    frameShape = CFrameShape.NoFrame;
    /**
    * Flat, raised or sunken edge treatment selected from CFrameShadow.
    */
    frameShadow = CFrameShadow.Plain;
    /**
    * Returns the line width used by the style.
    */
    lineWidth = 1;
    /**
    * Returns the mid line width used by the style.
    */
    midLineWidth = 0;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
    */
    constructor(other: CStyleOptionFrame | null = null) {
		super(other);

		if (other) {
			this.frameShape = other.frameShape;
			this.frameShadow = other.frameShadow;
			this.lineWidth = other.lineWidth;
			this.midLineWidth = other.midLineWidth;
		}
	}

    /**
    * Initializes this style option from the specified frame.
    *
    * @param frame Frame.
    */
    initFromFrame(frame: CFrame): void {
		this.initFrom(frame);

		this.frameShape = frame.frameShape();
		this.frameShadow = frame.frameShadow();
		this.lineWidth = frame.lineWidth();
		this.midLineWidth = frame.midLineWidth();
	}
}