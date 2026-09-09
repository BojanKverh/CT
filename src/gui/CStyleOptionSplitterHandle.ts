import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";

export class CStyleOptionSplitterHandle extends CStyleOption {
	orientation = COrientation.Horizontal;

	constructor(other: CStyleOptionSplitterHandle | null = null) {
		super(other);

		if (other)
			this.orientation = other.orientation;
	}

	initFromSplitterHandle(handle: CSplitterHandle): void {
		this.initFrom(handle);

		this.orientation = handle.orientation();
	}
}