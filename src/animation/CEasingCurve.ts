export enum CEasingCurveType { Linear, InQuad, OutQuad, InOutQuad, OutCubic }

/** Maps normalized time to normalized progress. Inputs are clamped to [0, 1]. */
export class CEasingCurve {
    #type: CEasingCurveType;
    constructor(type = CEasingCurveType.Linear) {
        this.#type = type;
        this.setType(type);
    }
    type(): CEasingCurveType { return this.#type; }
    setType(type: CEasingCurveType): void {
        if (![CEasingCurveType.Linear, CEasingCurveType.InQuad, CEasingCurveType.OutQuad,
            CEasingCurveType.InOutQuad, CEasingCurveType.OutCubic].includes(type))
            throw new RangeError("Unknown easing curve.");
        this.#type = type;
    }
    valueForProgress(progress: number): number {
        const t = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, progress));
        switch (this.#type) {
            case CEasingCurveType.InQuad: return t * t;
            case CEasingCurveType.OutQuad: return t * (2 - t);
            case CEasingCurveType.InOutQuad: return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2;
            case CEasingCurveType.OutCubic: return 1 - (1 - t) ** 3;
            default: return t;
        }
    }
}
