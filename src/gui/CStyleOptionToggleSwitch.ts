/** @module GUI/CStyleOptionToggleSwitch */
import { CStyleOptionButton } from "./CStyleOptionButton.js";

/** Painting state for a toggle switch; position is the animated thumb offset (0..1). */
export class CStyleOptionToggleSwitch extends CStyleOptionButton {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";
    /** Interpolated switch-thumb position used by the drawing style. */
    position = 0;
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionToggleSwitch | null = null) {
        super(other);
        if (other !== null) { this.text = other.text; this.position = other.position; }
    }
}
