/** @module GUI/CStyleOptionSplitButton */
import { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";

/** Painting state for the independent main and menu parts of a split button. */
export class CStyleOptionSplitButton extends CStyleOptionPushButton {
    /** Logical width reserved for the independent menu region. */
    menuWidth = 0;
    /** Whether the main action region is pressed. */
    mainDown = false;
    /** Whether the menu region is pressed. */
    menuDown = false;
    /** Whether the pointer is over the main action region. */
    mainHovered = false;
    /** Whether the pointer is over the menu region. */
    menuHovered = false;

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionSplitButton | null = null) {
        super(other);
        if (other === null) return;
        this.menuWidth = other.menuWidth;
        this.mainDown = other.mainDown;
        this.menuDown = other.menuDown;
        this.mainHovered = other.mainHovered;
        this.menuHovered = other.menuHovered;
    }
}
