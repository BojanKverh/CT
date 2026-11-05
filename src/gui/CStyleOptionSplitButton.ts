import type { CIcon } from "./CIcon.js";
import { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";

/** Painting state for the independent main and menu parts of a split button. */
export class CStyleOptionSplitButton extends CStyleOptionPushButton {
    menuWidth = 0;
    mainDown = false;
    menuDown = false;
    mainHovered = false;
    menuHovered = false;
    icon: CIcon | null = null;

    constructor(other: CStyleOptionSplitButton | null = null) {
        super(other);
        if (other === null) return;
        this.menuWidth = other.menuWidth;
        this.mainDown = other.mainDown;
        this.menuDown = other.menuDown;
        this.mainHovered = other.mainHovered;
        this.menuHovered = other.menuHovered;
        this.icon = other.icon;
    }
}
