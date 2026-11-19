/** @module Geometry/CSizePolicy */
/** Describes whether a layout may grow or shrink an axis around sizeHint(). */
export enum CSizePolicyType {
    /**
    * Keep the preferred extent instead of distributing extra space to this item.
    */
    Fixed = 0,
    /**
    * Use the preferred extent as a lower sizing preference and allow growth.
    */
    Minimum = 1,
    /**
    * Allow shrinking below the preferred extent without requesting growth.
    */
    Maximum = 4,
    /**
    * Use the preferred extent as a starting point while allowing resizing.
    */
    Preferred = 5,
    /**
    * Request a share of extra space while allowing shrinkage.
    */
    Expanding = 7,
    /**
    * Request extra space while treating the preferred extent as a minimum preference.
    */
    MinimumExpanding = 3,
    /**
    * Ignore the size hint when distributing available layout space.
    */
    Ignored = 13
}

/** Value object describing horizontal and vertical layout preferences. */
export class CSizePolicy {
    #horizontal: CSizePolicyType;
    #vertical: CSizePolicyType;
    #heightForWidth = false;
    #horizontalStretch = 0;
    #verticalStretch = 0;

    /**
    * Copies allocation policies or initializes the horizontal and vertical policies and stretch factors.
    * @param horizontal Input used to configure CSizePolicy. Omit to use `CSizePolicyType.Preferred`.
    * @param vertical Input used to configure CSizePolicy. Omit to use `CSizePolicyType.Preferred`.
    */
    constructor(horizontal: CSizePolicyType | CSizePolicy = CSizePolicyType.Preferred,
        vertical = CSizePolicyType.Preferred) {
        if (horizontal instanceof CSizePolicy) {
            this.#heightForWidth = horizontal.#heightForWidth;
            this.#horizontal = horizontal.#horizontal;
            this.#vertical = horizontal.#vertical;
            this.#horizontalStretch = horizontal.#horizontalStretch;
            this.#verticalStretch = horizontal.#verticalStretch;
        } else {
            this.#horizontal = horizontal;
            this.#vertical = vertical;
        }
    }

    /**
    * Reports whether preferred height depends on allocated width.
    */
    hasHeightForWidth(): boolean { return this.#heightForWidth; }
    /**
    * Marks whether layouts should query heightForWidth() for this item.
    */
    setHeightForWidth(enabled: boolean): void { this.#heightForWidth = enabled; }

    /**
    * Returns the horizontal growth and shrink policy.
    */
    horizontalPolicy(): CSizePolicyType { return this.#horizontal; }
    /**
    * Returns the vertical growth and shrink policy.
    */
    verticalPolicy(): CSizePolicyType { return this.#vertical; }
    /**
    * Changes horizontal allocation behavior used by layouts.
    */
    setHorizontalPolicy(policy: CSizePolicyType): void { this.#horizontal = policy; }
    /**
    * Changes vertical allocation behavior used by layouts.
    */
    setVerticalPolicy(policy: CSizePolicyType): void { this.#vertical = policy; }
    /**
    * Returns the horizontal relative stretch factor.
    */
    horizontalStretch(): number { return this.#horizontalStretch; }
    /**
    * Returns the vertical relative stretch factor.
    */
    verticalStretch(): number { return this.#verticalStretch; }
    /**
    * Changes horizontal relative weight for distributable layout space.
    */
    setHorizontalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#horizontalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    /**
    * Changes vertical relative weight for distributable layout space.
    */
    setVerticalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#verticalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    /**
    * Compares horizontal and vertical policies, stretch factors and height-for-width state.
    */
    isEqual(other: CSizePolicy): boolean {
        return this.#heightForWidth === other.#heightForWidth && this.#horizontal === other.#horizontal && this.#vertical === other.#vertical
            && this.#horizontalStretch === other.#horizontalStretch && this.#verticalStretch === other.#verticalStretch;
    }
    /**
    * Reports whether a policy permits allocation above the preferred extent.
    */
    static canGrow(policy: CSizePolicyType): boolean { return (policy & 1) !== 0; }
    /**
    * Reports whether a policy permits allocation below the preferred extent.
    */
    static canShrink(policy: CSizePolicyType): boolean { return (policy & 4) !== 0; }
    /**
    * Reports whether a policy requests a share of excess space.
    */
    static isExpanding(policy: CSizePolicyType): boolean { return (policy & 2) !== 0; }
    /**
    * Reports whether a policy allows layout allocation without using the preferred-size hint.
    */
    static ignoresHint(policy: CSizePolicyType): boolean { return (policy & 8) !== 0; }
}
