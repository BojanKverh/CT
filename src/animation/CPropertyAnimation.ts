import type { CObject } from "../core/CObject.js";
import { CAnimationState } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";
import { CVariantAnimation } from "./CVariantAnimation.js";

/**
 * Numeric animation bound to a setter, for example value => widget.setOpacity(value).
 * Configuration while stopped does not touch the target. Starting, seeking and
 * applyCurrentValue() write it explicitly, even when the numeric value is unchanged.
 * Stop or destroy the animation before disposing of a target captured by the setter.
 */
export class CPropertyAnimation extends CVariantAnimation {
    #setter: ((value: number) => void) | null;
    #configurationDepth = 0;

    constructor(setter: (value: number) => void, parent: CObject | null = null) {
        if (typeof setter !== "function") throw new TypeError("A property setter is required.");
        super(parent);
        this.#setter = setter;
        // Installed before client listeners so they observe the updated property.
        this.valueChanged.connect(() => {
            if (this.#configurationDepth === 0) this.#writeValue();
        });
    }

    override setStartValue(value: number): void {
        this.#configure(() => super.setStartValue(value));
    }
    override setEndValue(value: number): void {
        this.#configure(() => super.setEndValue(value));
    }
    override setDuration(duration: number): void {
        this.#configure(() => super.setDuration(duration));
    }
    override setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#configure(() => super.setEasingCurve(curve));
    }

    protected override updateCurrentTime(time: number): void {
        const previous = this.currentValue();
        super.updateCurrentTime(time);
        // CVariantAnimation emits only on a change. Constant values must also
        // restore the target when a new sequential stage starts or is sought.
        if (previous === this.currentValue() && this.#configurationDepth === 0)
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
