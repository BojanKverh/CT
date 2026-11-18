import type { CObject } from "../core/CObject.js";
import { CAnimationState, CAnimationDirection } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";
import { CVariantAnimation, type CAnimationValue, type CAnimationKeyValue } from "./CVariantAnimation.js";

/**
 * Animation bound to a setter, for example value => widget.setOpacity(value).
 * Configuration while stopped does not touch the target. Starting, seeking and
 * applyCurrentValue() write it explicitly, even when the numeric value is unchanged.
 * Stop or destroy the animation before disposing of a target captured by the setter.
 */
export class CPropertyAnimation<T extends CAnimationValue = number> extends CVariantAnimation<T> {
    #setter: ((value: T) => void) | null;
    #configurationDepth = 0;
    #valueRevision = 0;

    constructor(setter: (value: T) => void, parent: CObject | null = null) {
        if (typeof setter !== "function") throw new TypeError("A property setter is required.");
        super(parent);
        this.#setter = setter;
        // Installed before client listeners so they observe the updated property.
        this.valueChanged.connect(() => {
            ++this.#valueRevision;
            if (this.#configurationDepth === 0) this.#writeValue();
        });
    }

    /**
     * Replaces the starting value. While stopped, the change does not write to the target.
     * @param value Finite value of the same kind as the other endpoints and keys.
     */
    override setStartValue(value: T): void {
        this.#configure(() => super.setStartValue(value));
    }
    /**
     * Replaces the ending value. While stopped, the change does not write to the target.
     * @param value Finite value of the same kind as the other endpoints and keys.
     */
    override setEndValue(value: T): void {
        this.#configure(() => super.setEndValue(value));
    }
    /**
     * Inserts or replaces a key at an eased progress step. While stopped, the change does not write to the target.
     * @param step Finite step between zero and one, inclusive.
     * @param value Finite value matching the animation's value kind.
     */
    override setKeyValueAt(step: number, value: T): void {
        this.#configure(() => super.setKeyValueAt(step, value));
    }
    /**
     * Replaces intermediate keys and updates supplied endpoints. While stopped, the change does not write to the target.
     * @param values Pairs of eased progress steps and matching finite values.
     */
    override setKeyValues(values: readonly CAnimationKeyValue<T>[]): void {
        this.#configure(() => super.setKeyValues(values));
    }
    /**
     * Changes the time allocated to one pass. While stopped, the change does not write to the target.
     * @param duration Finite nonnegative duration in milliseconds. Endless playback requires a positive duration.
     */
    override setDuration(duration: number): void {
        this.#configure(() => super.setDuration(duration));
    }
    /**
     * Changes the mapping from elapsed to interpolated progress. While stopped, the change does not write to the target.
     * @param curve Curve object to copy or a supported curve type.
     */
    override setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#configure(() => super.setEasingCurve(curve));
    }

    /**
     * Changes the number of passes. While stopped, the change does not write to the target.
     * @param count Nonnegative safe integer number of passes or `-1` for unbounded playback.
     */
    override setLoopCount(count: number): void { this.#configure(() => super.setLoopCount(count)); }
    /**
     * Changes the configured playback direction. While stopped, the change does not write to the target.
     * @param direction Forward or backward direction.
     */
    override setDirection(direction: CAnimationDirection): void { this.#configure(() => super.setDirection(direction)); }
    /**
     * Changes whether consecutive loops alternate direction. While stopped, the change does not write to the target.
     * @param enabled `true` to reverse every odd-numbered loop.
     */
    override setAutoReverse(enabled: boolean): void { this.#configure(() => super.setAutoReverse(enabled)); }

    /**
     * Interpolates the value and writes it to the bound setter even when it has not changed, unless stopped configuration is suppressing writes.
     * @param time Direction-adjusted time in milliseconds within the current pass.
     */
    protected override updateCurrentTime(time: number): void {
        const previous = this.#valueRevision;
        super.updateCurrentTime(time);
        // CVariantAnimation emits only on a change. Constant values must also
        // restore the target when a new sequential stage starts or is sought.
        if (previous === this.#valueRevision && this.#configurationDepth === 0)
            this.#writeValue();
    }

    #configure(configure: () => void): void {
        if (this.isDestroyed()) return;
        // Future sequential members must not overwrite the currently active target.
        const suppress = this.state() === CAnimationState.Stopped;
        if (suppress) ++this.#configurationDepth;
        try { configure(); }
        finally { if (suppress) --this.#configurationDepth; }
    }

    #writeValue(): void {
        if (!this.isDestroyed()) this.#setter?.(this.currentValue());
    }

    /** Releases the bound setter and its captured references, then destroys the animation. */
    override destroy(): void {
        // Release references captured by the callback, including on reentrant destroy.
        this.#setter = null;
        super.destroy();
    }
}
