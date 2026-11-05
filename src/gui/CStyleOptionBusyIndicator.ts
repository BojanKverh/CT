import { CStyleOption } from "./CStyleOption.js";

/** Painting state for an indeterminate progress indicator. */
export class CStyleOptionBusyIndicator extends CStyleOption {
    running = false;
    angle = 0;
    constructor(other: CStyleOptionBusyIndicator | null = null) {
        super(other);
        if (other !== null) { this.running = other.running; this.angle = other.angle; }
    }
}
