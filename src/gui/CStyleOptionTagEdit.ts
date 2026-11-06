import { CStyleOption } from "./CStyleOption.js";

/** Painting state for a removable tag inside CTagEdit. */
export class CStyleOptionTagEdit extends CStyleOption {
    text = "";
    readOnly = false;
    removeHovered = false;
    removePressed = false;
    constructor(other: CStyleOptionTagEdit | null = null) {
        super(other);
        if (other !== null) {
            this.text = other.text; this.readOnly = other.readOnly;
            this.removeHovered = other.removeHovered; this.removePressed = other.removePressed;
        }
    }
}
