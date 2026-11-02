import { CSignal } from "../core/CSignal.js";
import { CPoint } from "../geometry/CPoint.js";
import { CSize } from "../geometry/CSize.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractAnimation } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";

export type CAnimationValue = number | CPoint | CSize | CRect;
type ValueKind = "number" | "point" | "size" | "rect";

function kind(value: CAnimationValue): ValueKind {
    if (typeof value === "number") return "number";
    if (value instanceof CPoint) return "point";
    if (value instanceof CSize) return "size";
    if (value instanceof CRect) return "rect";
    throw new TypeError("Animation values must be numbers, CPoint, CSize or CRect.");
}
function components(value: CAnimationValue): number[] {
    if (typeof value === "number") return [value];
    if (value instanceof CPoint) return [value.x(), value.y()];
    if (value instanceof CSize) return [value.width(), value.height()];
    return [value.x(), value.y(), value.width(), value.height()];
}
function compose(type: ValueKind, values: number[]): CAnimationValue {
    switch (type) {
        case "point": return new CPoint(values[0]!, values[1]!);
        case "size": return new CSize(values[0]!, values[1]!);
        case "rect": return new CRect(values[0]!, values[1]!, values[2]!, values[3]!);
        default: return values[0]!;
    }
}
function copy(value: CAnimationValue): CAnimationValue { return compose(kind(value), components(value)); }
function same(a: CAnimationValue, b: CAnimationValue): boolean {
    if (kind(a) !== kind(b)) return false;
    const values = components(b);
    return components(a).every((value, index) => value === values[index]);
}
function interpolate(start: number, end: number, progress: number): number {
    // Interpolate inside the interval without overflowing end - start.
    // Outside it, extrapolate from the nearest endpoint so elastic curves
    // preserve their overshoot, including when both endpoints are negative.
    let value: number;
    if (progress === 0 || start === end) value = start;
    else if (progress === 1) value = end;
    else if (progress > 0 && progress < 1)
        value = start * (1 - progress) + end * progress;
    else {
        const delta = end - start;
        value = progress > 1 ? end + delta * (progress - 1) : start + delta * progress;
        // A true extrapolation can exceed the finite numeric range.
        value = Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, value));
    }
    return value;
}

/**
 * Interpolates numbers or all components of a geometry value without rounding.
 * Numbers remain the default. The first endpoint fixes the runtime value kind;
 * configure a geometry endpoint before using a geometry animation. The other
 * endpoint defaults to all zeroes (start) or all ones (end) of the same kind.
 * Inputs, getters and signal values are copied to protect stored geometry.
 * Elastic extrapolation is preserved, including negative size components.
 */
export class CVariantAnimation<T extends CAnimationValue = number> extends CAbstractAnimation {
    #start: CAnimationValue = 0;
    #end: CAnimationValue = 1;
    #value: CAnimationValue = 0;
    #kind: ValueKind | null = null;
    #curve = new CEasingCurve();
    readonly valueChanged = new CSignal<[T]>();

    startValue(): T { return copy(this.#start) as T; }
    endValue(): T { return copy(this.#end) as T; }
    currentValue(): T { return copy(this.#value) as T; }
    setStartValue(value: T): void {
        this.#checkValue(value); this.#start = copy(value); this.updateCurrentTime(this.currentTime());
    }
    setEndValue(value: T): void {
        this.#checkValue(value); this.#end = copy(value); this.updateCurrentTime(this.currentTime());
    }
    easingCurve(): CEasingCurve { return new CEasingCurve(this.#curve); }
    setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#curve = new CEasingCurve(curve);
        this.updateCurrentTime(this.currentTime());
    }
    /** Re-emits a copy even when the current value has not changed. */
    override applyCurrentValue(): void {
        if (!this.isDestroyed()) this.valueChanged.emit(this.currentValue());
    }
    #checkValue(value: T): void {
        const type = kind(value);
        if (!components(value).every(Number.isFinite))
            throw new RangeError("Animation value components must be finite numbers.");
        if (this.#kind !== null && type !== this.#kind)
            throw new TypeError("Animation endpoints must have the same value kind.");
        if (this.#kind === null) {
            const count = components(value).length;
            this.#start = compose(type, Array<number>(count).fill(0));
            this.#end = compose(type, Array<number>(count).fill(1));
            this.#kind = type;
        }
    }
    protected override updateCurrentTime(time: number): void {
        const progress = this.duration() === 0 ? 1 : this.#curve.valueForProgress(time / this.duration());
        const starts = components(this.#start), ends = components(this.#end);
        const value = compose(this.#kind ?? "number", starts.map((start, i) => interpolate(start, ends[i]!, progress)));
        if (same(value, this.#value)) return;
        this.#value = value;
        this.valueChanged.emit(this.currentValue());
    }
}
