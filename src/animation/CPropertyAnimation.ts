import type { CObject } from "../core/CObject.js";
import { CAnimationState, CAnimationDirection } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";
import { CVariantAnimation, type CAnimationValue } from "./CVariantAnimation.js";

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

    override setStartValue(value: T): void {
        this.#configure(() => super.setStartValue(value));
    }
    override setEndValue(value: T): void {
        this.#configure(() => super.setEndValue(value));
    }
    override setDuration(duration: number): void {
        this.#configure(() => super.setDuration(duration));
    }
    override setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#configure(() => super.setEasingCurve(curve));
    }

    override setLoopCount(count: number): void { this.#configure(() => super.setLoopCount(count)); }
    override setDirection(direction: CAnimationDirection): void { this.#configure(() => super.setDirection(direction)); }
    override setAutoReverse(enabled: boolean): void { this.#configure(() => super.setAutoReverse(enabled)); }

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

    override destroy(): void {
        // Release references captured by the callback, including on reentrant destroy.
        this.#setter = null;
        super.destroy();
    }
}
