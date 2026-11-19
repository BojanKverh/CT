/** @module GUI/CStyleOptionTagEdit */
import { CStyleOption } from "./CStyleOption.js";

/** Painting state for a removable tag inside CTagEdit. */
export class CStyleOptionTagEdit extends CStyleOption {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";
    /** Whether interaction may change the displayed value. */
    readOnly = false;
    /** Whether the tag's remove affordance has hover feedback. */
    removeHovered = false;
    /** Whether the tag's remove affordance has pressed feedback. */
    removePressed = false;
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionTagEdit | null = null) {
        super(other);
        if (other !== null) {
            this.text = other.text; this.readOnly = other.readOnly;
            this.removeHovered = other.removeHovered; this.removePressed = other.removePressed;
        }
    }
}
