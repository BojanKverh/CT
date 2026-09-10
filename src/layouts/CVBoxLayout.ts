import { CBoxLayout, CBoxLayoutDirection } from "./CBoxLayout.js";

/**
 * Box layout that arranges its items vertically from top to bottom.
 */
export class CVBoxLayout extends CBoxLayout {
	/** Creates a top-to-bottom vertical box layout. */
	constructor() {
		super(CBoxLayoutDirection.TopToBottom);
	}
}
