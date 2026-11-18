import type { CObject } from "../core/CObject.js";
import { CAbstractAnimation } from "./CAbstractAnimation.js";

/** A timed interval that leaves target values unchanged, useful in animation groups. */
export class CPauseAnimation extends CAbstractAnimation {
    constructor(duration = 250, parent: CObject | null = null) {
        if (!Number.isFinite(duration) || duration < 0)
            throw new RangeError("Duration must be finite and nonnegative.");
        super(parent);
        this.setDuration(duration);
    }

    /**
     * Leaves the rendered value unchanged while the pause occupies time in a timeline.
     * @param _time Position within the pause in milliseconds. No value is applied.
     */
    protected override updateCurrentTime(_time: number): void {}
}
