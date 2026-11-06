import { CStyleOptionButton } from "./CStyleOptionButton.js";

/** Painting state for a toggle switch; position is the animated thumb offset (0..1). */
export class CStyleOptionToggleSwitch extends CStyleOptionButton {
    text = "";
    position = 0;
    constructor(other: CStyleOptionToggleSwitch | null = null) {
        super(other);
        if (other !== null) { this.text = other.text; this.position = other.position; }
    }
}
