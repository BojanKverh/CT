import { CStyleOption } from "./CStyleOption.js";
import { COrientation } from "./COrientation.js";
import type { CSplitterHandle } from "../widgets/CSplitterHandle.js";

/**
 * Contains style information used to render a splitter handle.
 */
export class CStyleOptionSplitterHandle extends CStyleOption {
		/**
	 * Returns or updates the orientation value.
	 */
orientation = COrientation.Horizontal;

		/**
	 * Creates a new CStyleOptionSplitterHandle instance.
	 *
	 * @param other Other.
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