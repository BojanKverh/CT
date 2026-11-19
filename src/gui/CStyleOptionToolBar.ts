/** @module GUI/CStyleOptionToolBar */
import { CStyleOption } from "./CStyleOption.js";
import type { CToolBar } from "../widgets/CToolBar.js";

/**
 * Contains style information used to render a tool bar.
 */
export class CStyleOptionToolBar extends CStyleOption {
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
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