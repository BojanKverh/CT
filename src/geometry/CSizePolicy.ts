/** Describes whether a layout may grow or shrink an axis around sizeHint(). */
export enum CSizePolicyType {
    Fixed = 0,
    Minimum = 1,
    Maximum = 4,
    Preferred = 5,
    Expanding = 7,
    MinimumExpanding = 3,
    Ignored = 13
}

/** Value object describing horizontal and vertical layout preferences. */
export class CSizePolicy {
    #horizontal: CSizePolicyType;
    #vertical: CSizePolicyType;
    #horizontalStretch = 0;
    #verticalStretch = 0;

    constructor(horizontal: CSizePolicyType | CSizePolicy = CSizePolicyType.Preferred,
        vertical = CSizePolicyType.Preferred) {
        if (horizontal instanceof CSizePolicy) {
            this.#horizontal = horizontal.#horizontal;
            this.#vertical = horizontal.#vertical;
            this.#horizontalStretch = horizontal.#horizontalStretch;
            this.#verticalStretch = horizontal.#verticalStretch;
        } else {
            this.#horizontal = horizontal;
            this.#vertical = vertical;
        }
    }

    horizontalPolicy(): CSizePolicyType { return this.#horizontal; }
    verticalPolicy(): CSizePolicyType { return this.#vertical; }
    setHorizontalPolicy(policy: CSizePolicyType): void { this.#horizontal = policy; }
    setVerticalPolicy(policy: CSizePolicyType): void { this.#vertical = policy; }
    horizontalStretch(): number { return this.#horizontalStretch; }
    verticalStretch(): number { return this.#verticalStretch; }
    setHorizontalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#horizontalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    setVerticalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#verticalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    isEqual(other: CSizePolicy): boolean {
        return this.#horizontal === other.#horizontal && this.#vertical === other.#vertical
            && this.#horizontalStretch === other.#horizontalStretch && this.#verticalStretch === other.#verticalStretch;
    }
    static canGrow(policy: CSizePolicyType): boolean { return (policy & 1) !== 0; }
    static canShrink(policy: CSizePolicyType): boolean { return (policy & 4) !== 0; }
    static isExpanding(policy: CSizePolicyType): boolean { return (policy & 2) !== 0; }
    static ignoresHint(policy: CSizePolicyType): boolean { return (policy & 8) !== 0; }
}
