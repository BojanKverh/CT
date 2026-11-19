/** @module Layouts/CHBoxLayout */
import { CBoxLayout, CBoxLayoutDirection } from "./CBoxLayout.js";

/**
 * Box layout that arranges its items horizontally from left to right.
 */
export class CHBoxLayout extends CBoxLayout {
    /** Creates a left-to-right horizontal box layout. */
    constructor() {
		super(CBoxLayoutDirection.LeftToRight);
	}
}
