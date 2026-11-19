/** @module Animation/CPauseAnimation */
import type { CObject } from "../core/CObject.js";
import { CAbstractAnimation } from "./CAbstractAnimation.js";

/** A timed interval that leaves target values unchanged, useful in animation groups. */
export class CPauseAnimation extends CAbstractAnimation {
    /**
    * Defines a timeline pause whose duration is measured in milliseconds.
    * @param duration Timeline duration in milliseconds. Omit to use `250`.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(duration = 250, parent: CObject | null = null) {
        if (!Number.isFinite(duration) || duration < 0)
            throw new RangeError("Duration must be finite and nonnegative.");
        super(parent);
        this.setDuration(duration);
    }

    protected override updateCurrentTime(_time: number): void {}
}
