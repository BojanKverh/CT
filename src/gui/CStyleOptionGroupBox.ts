/** @module GUI/CStyleOptionGroupBox */
import { CStyleOption } from "./CStyleOption.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";

/**
 * Contains style information used to render a group box.
 */
export class CStyleOptionGroupBox extends CStyleOption {
    /**
    * Caption painted across the group frame above its child controls.
    */
    title = "";
    /** Whether a collapse control is available in the header. */
    collapsible = false;
    /** Whether content is currently hidden by collapsing. */
    collapsed = false;
    /** Logical height reserved for the header. */
    headerHeight = 24;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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