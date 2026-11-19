/** @module Animation/CVariantAnimation */
import { CSignal } from "../core/CSignal.js";
import { CPoint } from "../geometry/CPoint.js";
import { CSize } from "../geometry/CSize.js";
import { CRect } from "../geometry/CRect.js";
import { CAbstractAnimation, CAnimationDirection } from "./CAbstractAnimation.js";
import { CEasingCurve, CEasingCurveType } from "./CEasingCurve.js";

/**
 * Numeric or geometric values supported by component-wise animation interpolation.
 */
export type CAnimationValue = number | CPoint | CSize | CRect;
/**
 * A normalized progress position and its value; intermediate positions interpolate between adjacent keyframes.
 */
export type CAnimationKeyValue<T extends CAnimationValue = number> = readonly [step: number, value: T];
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
 * Numbers remain the default. The first endpoint or key fixes the runtime value kind;
 * configure a geometry value before using a geometry animation. The other
 * endpoint defaults to all zeroes (start) or all ones (end) of the same kind.
 * Key steps use effective progress after the easing curve is applied.
 * Inputs, getters and signal values are copied to protect stored geometry.
 * Elastic extrapolation is preserved, including negative size components.
 */
export class CVariantAnimation<T extends CAnimationValue = number> extends CAbstractAnimation {
    #start: CAnimationValue = 0;
    #end: CAnimationValue = 1;
    #value: CAnimationValue = 0;
    #kind: ValueKind | null = null;
    #curve = new CEasingCurve();
    #keys: CAnimationKeyValue<CAnimationValue>[] = [];
    /**
    * Emitted with the bounded value after its stored value changes.
    * @group Signals
    */
    readonly valueChanged = new CSignal<[T]>();

    /**
    * Returns the configured first interpolation value.
    */
    startValue(): T { return copy(this.#start) as T; }
    /**
    * Returns the configured final interpolation value.
    */
    endValue(): T { return copy(this.#end) as T; }
    /**
    * Returns the value most recently evaluated along the animation timeline.
    */
    currentValue(): T { return copy(this.#value) as T; }
    /**
    * Changes the value evaluated at the beginning of the timeline.
    */
    setStartValue(value: T): void {
        this.#checkValue(value); this.#start = copy(value); this.updateCurrentTime(this.currentLoopTime());
    }
    /**
    * Changes the value evaluated at the end of the timeline.
    */
    setEndValue(value: T): void {
        this.#checkValue(value); this.#end = copy(value); this.updateCurrentTime(this.currentLoopTime());
    }
    /** Exact key lookup, including the implicit start (0) and end (1); null if absent. */
    keyValueAt(step: number): T | null {
        this.#checkStep(step);
        if (step === 0) return this.startValue();
        if (step === 1) return this.endValue();
        const key = this.#keys.find(key => key[0] === step);
        return key === undefined ? null : copy(key[1]) as T;
    }
    /** A sorted, independent snapshot including start and end. Geometry is copied. */
    keyValues(): CAnimationKeyValue<T>[] {
        const result: CAnimationKeyValue<T>[] = [[0, this.startValue()]];
        for (const [step, value] of this.#keys) result.push([step, copy(value) as T]);
        result.push([1, this.endValue()]);
        return result;
    }
    /** Keys refer to eased progress, not necessarily elapsed time. Replaces equal steps. */
    setKeyValueAt(step: number, value: T): void {
        this.#checkStep(step);
        if (step === 0) { this.setStartValue(value); return; }
        if (step === 1) { this.setEndValue(value); return; }
        this.#checkValue(value);
        const keys = this.#keys.filter(key => key[0] !== step);
        keys.push([step, copy(value)]); keys.sort((a, b) => a[0] - b[0]);
        this.#keys = keys;
        this.updateCurrentTime(this.currentLoopTime());
    }
    /**
    * Atomically replaces intermediate keys. Supplied 0/1 keys replace endpoints;
    * omitted endpoints retain their values. [] clears intermediate keys.
    * Input may be unsorted; the last occurrence of a duplicate step wins.
    */
    setKeyValues(values: readonly CAnimationKeyValue<T>[]): void {
        const keys = new Map<number, CAnimationValue>();
        let type = this.#kind;
        for (const entry of values) {
            if (!Array.isArray(entry) || entry.length !== 2)
                throw new TypeError("Each animation key must be a [step, value] pair.");
            const [step, value] = entry;
            this.#checkStep(step);
            type = this.#validateValue(value, type);
            keys.set(step, copy(value));
        }
        if (type !== null) this.#adoptKind(type);
        const sorted = [...keys].sort((a, b) => a[0] - b[0]);
        this.#keys = [];
        for (const [step, value] of sorted) {
            if (step === 0) this.#start = value;
            else if (step === 1) this.#end = value;
            else this.#keys.push([step, value]);
        }
        this.updateCurrentTime(this.currentLoopTime());
    }
    #checkStep(step: number): void {
        if (!Number.isFinite(step) || step < 0 || step > 1)
            throw new RangeError("Animation key steps must be finite numbers from 0 to 1.");
    }
    /**
    * Returns the curve used to transform normalized timeline progress.
    */
    easingCurve(): CEasingCurve { return new CEasingCurve(this.#curve); }
    /**
    * Assigns the easing curve used when evaluating interpolated values.
    */
    setEasingCurve(curve: CEasingCurve | CEasingCurveType): void {
        this.#curve = new CEasingCurve(curve);
        this.updateCurrentTime(this.currentLoopTime());
    }
    /** Re-emits a copy even when the current value has not changed. */
    override applyCurrentValue(): void {
        if (!this.isDestroyed()) this.valueChanged.emit(this.currentValue());
    }
    #validateValue(value: T, expected: ValueKind | null): ValueKind {
        const type = kind(value);
        if (!components(value).every(Number.isFinite))
            throw new RangeError("Animation value components must be finite numbers.");
        if (expected !== null && type !== expected)
            throw new TypeError("Animation endpoints and keys must have the same value kind.");
        return type;
    }
    #adoptKind(type: ValueKind): void {
        if (this.#kind !== null) return;
        const count = type === "rect" ? 4 : type === "number" ? 1 : 2;
        this.#start = compose(type, Array<number>(count).fill(0));
        this.#end = compose(type, Array<number>(count).fill(1));
        this.#kind = type;
    }
    #checkValue(value: T): void { this.#adoptKind(this.#validateValue(value, this.#kind)); }
    protected override updateCurrentTime(time: number): void {
        const progress = this.duration() === 0 ? (this.currentDirection() === CAnimationDirection.Backward ? 0 : 1) : this.#curve.valueForProgress(time / this.duration());
        const keys: CAnimationKeyValue<CAnimationValue>[] = [[0, this.#start], ...this.#keys, [1, this.#end]];
        // Search in eased progress. Extrapolate outside [0, 1] using the nearest
        // segment so elastic curves retain their overshoot with multiple keys.
        let low = 1, high = keys.length - 1;
        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (progress > keys[middle]![0]) low = middle + 1;
            else high = middle;
        }
        const [fromStep, from] = keys[low - 1]!, [toStep, to] = keys[low]!;
        const localProgress = (progress - fromStep) / (toStep - fromStep);
        const starts = components(from), ends = components(to);
        const value = compose(this.#kind ?? "number", starts.map((start, i) => interpolate(start, ends[i]!, localProgress)));
        if (same(value, this.#value)) return;
        this.#value = value;
        this.valueChanged.emit(this.currentValue());
    }
}
