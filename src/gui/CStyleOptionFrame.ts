import { CStyleOption } from "./CStyleOption.js";
import { CFrameShape, CFrameShadow } from "./CFrameStyle.js";
import type { CFrame } from "../widgets/CFrame.js";

/**
 * Contains style information used to render a frame.
 */
export class CStyleOptionFrame extends CStyleOption {
		/**
	 * Returns or updates the frame shape value.
	 */
frameShape = CFrameShape.NoFrame;
		/**
	 * Returns or updates the frame shadow value.
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
	 * Creates a new CStyleOptionFrame instance.
	 *
	 * @param other Other.
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