/** @module GUI/CStyleOptionBusyIndicator */
import { CStyleOption } from "./CStyleOption.js";

/** Painting state for an indeterminate progress indicator. */
export class CStyleOptionBusyIndicator extends CStyleOption {
    /** Whether busy-animation feedback is running. */
    running = false;
    /** Current rotation angle used by the busy indicator. */
    angle = 0;
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionBusyIndicator | null = null) {
        super(other);
        if (other !== null) { this.running = other.running; this.angle = other.angle; }
    }
}
