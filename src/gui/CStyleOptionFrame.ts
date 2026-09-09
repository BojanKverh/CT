import { CStyleOption } from "./CStyleOption.js";
import { CFrameShape, CFrameShadow } from "./CFrameStyle.js";
import type { CFrame } from "../widgets/CFrame.js";

export class CStyleOptionFrame extends CStyleOption {
	frameShape = CFrameShape.NoFrame;
	frameShadow = CFrameShadow.Plain;
	lineWidth = 1;
	midLineWidth = 0;

	constructor(other: CStyleOptionFrame | null = null) {
		super(other);

		if (other) {
			this.frameShape = other.frameShape;
			this.frameShadow = other.frameShadow;
			this.lineWidth = other.lineWidth;
			this.midLineWidth = other.midLineWidth;
		}
	}

	initFromFrame(frame: CFrame): void {
		this.initFrom(frame);

		this.frameShape = frame.frameShape();
		this.frameShadow = frame.frameShadow();
		this.lineWidth = frame.lineWidth();
		this.midLineWidth = frame.midLineWidth();
	}
}