import { CSignal } from "../core/CSignal.js";
import { CAbstractAnimation } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";

/** Numeric interpolation. Connect valueChanged to any widget property setter. */
export class CVariantAnimation extends CAbstractAnimation {
    #start = 0;
    #end = 1;
    #value = 0;
    #curve = new CEasingCurve();
    readonly valueChanged = new CSignal<[number]>();

    startValue(): number { return this.#start; }
    endValue(): number { return this.#end; }
    currentValue(): number { return this.#value; }
    setStartValue(value: number): void {
        this.#checkValue(value); this.#start = value; this.updateCurrentTime(this.currentTime());
    }
    setEndValue(value: number): void {
        this.#checkValue(value); this.#end = value; this.updateCurrentTime(this.currentTime());
    }
    easingCurve(): CEasingCurve { return new CEasingCurve(this.#curve.type()); }
    setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#curve = new CEasingCurve(typeof curve === "number" ? curve : curve.type());
        this.updateCurrentTime(this.currentTime());
    }
    /** Explicitly re-emits the current value, useful when sequential members share a target. */
    override applyCurrentValue(): void {
        if (!this.isDestroyed()) this.valueChanged.emit(this.#value);
    }
    #checkValue(value: number): void {
        if (!Number.isFinite(value)) throw new RangeError("Animation values must be finite numbers.");
    }
    protected override updateCurrentTime(time: number): void {
        const progress = this.duration() === 0 ? 1 : this.#curve.valueForProgress(time / this.duration());
        // The weighted sum avoids overflowing end - start for opposite, large endpoints.
        const value = progress === 0 ? this.#start : progress === 1 ? this.#end
            : this.#start * (1 - progress) + this.#end * progress;
        if (value === this.#value) return;
        this.#value = value; this.valueChanged.emit(value);
    }
}
