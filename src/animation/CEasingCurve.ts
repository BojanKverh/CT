/**
 * Interpolation functions mapping normalized time to normalized progress; elastic curves may overshoot.
 */
// Append new types to keep the numeric values of existing curves unchanged.
export enum CEasingCurveType {
    /**
    * Progress equals normalized elapsed time.
    */
    Linear,
    /**
    * Quadratic acceleration from a slow start.
    */
    InQuad,
    /**
    * Quadratic deceleration toward the end.
    */
    OutQuad,
    /**
    * Quadratic acceleration followed by quadratic deceleration.
    */
    InOutQuad,
    /**
    * Cubic deceleration toward the end.
    */
    OutCubic,
    /**
    * Damped elastic oscillation around the final value.
    */
    OutElastic,
    /**
    * Repeated diminishing bounces approaching the final value.
    */
    OutBounce
}

/** Clamps input time to [0, 1]. Elastic output may exceed that interval. */
export class CEasingCurve {
    #type = CEasingCurveType.Linear;
    #oscillations = 2.25;
    #damping = 6;

    /** Copies all settings when constructed from another curve. */
    constructor(curve: CEasingCurveType | CEasingCurve = CEasingCurveType.Linear) {
        if (curve instanceof CEasingCurve) {
            this.#type = curve.#type;
            this.#oscillations = curve.#oscillations;
            this.#damping = curve.#damping;
        } else this.setType(curve);
    }
    /**
    * Configured interpolation or representation type.
    * The initial value is `CEasingCurveType.Linear`.
    */
    type(): CEasingCurveType { return this.#type; }
    /**
    * Selects a supported curve family. Throws RangeError for an unknown enum value.
    */
    setType(type: CEasingCurveType): void {
        if (![CEasingCurveType.Linear, CEasingCurveType.InQuad, CEasingCurveType.OutQuad,
            CEasingCurveType.InOutQuad, CEasingCurveType.OutCubic,
            CEasingCurveType.OutElastic, CEasingCurveType.OutBounce].includes(type))
            throw new RangeError("Unknown easing curve.");
        this.#type = type;
    }
    /** Oscillation frequency over the full duration; zero disables oscillation. */
    oscillations(): number { return this.#oscillations; }
    /**
    * Sets full-duration elastic oscillations. Accepts finite non-negative values with finite angular frequency; otherwise throws RangeError.
    */
    setOscillations(oscillations: number): void {
        if (!Number.isFinite(oscillations) || oscillations < 0
            || !Number.isFinite(2 * Math.PI * oscillations))
            throw new RangeError("Oscillations must be nonnegative with a finite angular frequency.");
        this.#oscillations = Math.max(0, oscillations);
    }
    /** Exponential decay over the duration. Larger values settle more quickly. */
    damping(): number { return this.#damping; }
    /**
    * Sets finite non-negative exponential damping for the elastic curve. Invalid values throw RangeError.
    */
    setDamping(damping: number): void {
        if (!Number.isFinite(damping) || damping < 0)
            throw new RangeError("Damping must be finite and nonnegative.");
        this.#damping = Math.max(0, damping);
    }
    /**
    * Transforms normalized progress using the selected curve. Input is clamped to [0, 1], NaN becomes zero, and endpoints are exact. Elastic output may overshoot.
    */
    valueForProgress(progress: number): number {
        const t = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress));
        if (t === 0 || t === 1) return t;
        switch (this.#type) {
            case CEasingCurveType.InQuad: return t * t;
            case CEasingCurveType.OutQuad: return t * (2 - t);
            case CEasingCurveType.InOutQuad: return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2;
            case CEasingCurveType.OutCubic: return 1 - (1 - t) ** 3;
            case CEasingCurveType.OutElastic: return this.#elastic(t);
            case CEasingCurveType.OutBounce: return this.#bounce(t);
            default: return t;
        }
    }
    #elastic(t: number): number {
        if (this.#oscillations === 0 && this.#damping === 0) return t;
        const angle = 2 * Math.PI * this.#oscillations * t;
        const decay = this.#damping * t, envelope = Math.exp(-decay);
        // sin(x)/x has limit 1 at zero. This form also avoids damping/frequency
        // overflow at tiny frequencies and remains finite at large damping.
        const sinc = Math.abs(angle) < 0.0001
            ? 1 - angle * angle / 6 + angle ** 4 / 120 : Math.sin(angle) / angle;
        const displacement = envelope * Math.cos(angle) + decay * envelope * sinc;
        // Smoothly remove any residual vibration in the final 10%, even for
        // zero damping or a fractional oscillation count. No endpoint jump.
        const tail = Math.max(0, (t - 0.9) / 0.1);
        const window = (1 - tail) ** 2 * (1 + 2 * tail);
        return 1 - displacement * window;
    }
    #bounce(t: number): number {
        const scale = 7.5625, period = 2.75;
        if (t < 1 / period) return scale * t * t;
        if (t < 2 / period) { t -= 1.5 / period; return scale * t * t + 0.75; }
        if (t < 2.5 / period) { t -= 2.25 / period; return scale * t * t + 0.9375; }
        t -= 2.625 / period; return scale * t * t + 0.984375;
    }
}
