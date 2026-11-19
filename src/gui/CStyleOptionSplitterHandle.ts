/** @module GUI/CStyleOptionSplitterHandle */
import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";

/**
 * Contains style information used to render a splitter handle.
 */
export class CStyleOptionSplitterHandle extends CStyleOption {
    /**
    * Axis along which the style lays out and paints this control.
    */
    orientation = COrientation.Horizontal;

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionSplitterHandle | null = null) {
		super(other);

		if (other)
			this.orientation = other.orientation;
	}

    /**
    * Initializes this style option from the specified splitter handle.
    *
    * @param handle Handle.
    */
    initFromSplitterHandle(handle: CSplitterHandle): void {
		this.initFrom(handle);

		this.orientation = handle.orientation();
	}
}