import { CStyleOption } from "./CStyleOption.js";
import type { CToolBar } from "../widgets/CToolBar.js";

/**
 * Contains style information used to render a tool bar.
 */
export class CStyleOptionToolBar extends CStyleOption {
		/**
	 * Creates a new CStyleOptionToolBar instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionToolBar | null = null) {
		super(other);
	}

		/**
	 * Initializes this style option from the specified tool bar.
	 *
	 * @param toolBar Tool bar.
	 */
initFromToolBar(toolBar: CToolBar): void {
		this.initFrom(toolBar);
	}
}