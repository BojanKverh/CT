import { CStyleOption } from "./CStyleOption.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";

/**
 * Contains style information used to render a group box.
 */
export class CStyleOptionGroupBox extends CStyleOption {
		/**
	 * Returns or updates the title value.
	 */
title = "";
    collapsible = false;
    collapsed = false;
    headerHeight = 24;

		/**
	 * Creates a new CStyleOptionGroupBox instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionGroupBox | null = null) {
		super(other);

		if (other) {
            this.title = other.title; this.collapsible = other.collapsible;
            this.collapsed = other.collapsed; this.headerHeight = other.headerHeight;
        }
	}

		/**
	 * Initializes this style option from the specified group box.
	 *
	 * @param groupBox Group box.
	 */
initFromGroupBox(groupBox: CGroupBox): void {
		this.initFrom(groupBox);

		this.title = groupBox.title();
        this.collapsible = groupBox.isCollapsible(); this.collapsed = groupBox.isCollapsed(); this.headerHeight = groupBox.headerHeight();
	}
}