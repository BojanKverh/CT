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
    #heightForWidth = false;
    #horizontalStretch = 0;
    #verticalStretch = 0;

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
     * Checks the stored width-dependent height preference.
     * @returns `true` if preferred height depends on available width.
     */
    hasHeightForWidth(): boolean { return this.#heightForWidth; }
    /**
     * Records whether a layout should use width-dependent height.
     * @param enabled `true` to enable height-for-width.
     */
    setHeightForWidth(enabled: boolean): void { this.#heightForWidth = enabled; }

    /**
     * Reads the horizontal sizing preference.
     * @returns Policy used for width allocation.
     */
    horizontalPolicy(): CSizePolicyType { return this.#horizontal; }
    /**
     * Reads the vertical sizing preference.
     * @returns Policy used for height allocation.
     */
    verticalPolicy(): CSizePolicyType { return this.#vertical; }
    /**
     * Changes the horizontal sizing preference.
     * @param policy Policy to use for width allocation.
     */
    setHorizontalPolicy(policy: CSizePolicyType): void { this.#horizontal = policy; }
    /**
     * Changes the vertical sizing preference.
     * @param policy Policy to use for height allocation.
     */
    setVerticalPolicy(policy: CSizePolicyType): void { this.#vertical = policy; }
    /**
     * Reads the horizontal stretch weight.
     * @returns An integer weight from 0 to 255.
     */
    horizontalStretch(): number { return this.#horizontalStretch; }
    /**
     * Reads the vertical stretch weight.
     * @returns An integer weight from 0 to 255.
     */
    verticalStretch(): number { return this.#verticalStretch; }
    /**
     * Sets the horizontal weight. Finite values are rounded down and clamped to 0–255.
     * @param stretch Requested horizontal stretch weight.
     */
    setHorizontalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#horizontalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    /**
     * Sets the vertical weight. Finite values are rounded down and clamped to 0–255.
     * @param stretch Requested vertical stretch weight.
     */
    setVerticalStretch(stretch: number): void {
        if (Number.isFinite(stretch)) this.#verticalStretch = Math.max(0, Math.min(255, Math.floor(stretch)));
    }
    /**
     * Compares both axis policies, both stretch weights and the height-for-width flag.
     * @param other Policy to compare with this one.
     * @returns `true` if all five settings match.
     */
    isEqual(other: CSizePolicy): boolean {
        return this.#heightForWidth === other.#heightForWidth && this.#horizontal === other.#horizontal && this.#vertical === other.#vertical
            && this.#horizontalStretch === other.#horizontalStretch && this.#verticalStretch === other.#verticalStretch;
    }
    /**
     * Tests the grow flag of a sizing policy.
     * @param policy Axis policy to inspect.
     * @returns `true` if the axis may grow beyond its preferred size.
     */
    static canGrow(policy: CSizePolicyType): boolean { return (policy & 1) !== 0; }
    /**
     * Tests the shrink flag of a sizing policy.
     * @param policy Axis policy to inspect.
     * @returns `true` if the axis may shrink below its preferred size.
     */
    static canShrink(policy: CSizePolicyType): boolean { return (policy & 4) !== 0; }
    /**
     * Tests the expansion flag of a sizing policy.
     * @param policy Axis policy to inspect.
     * @returns `true` if the policy marks the axis as expanding.
     */
    static isExpanding(policy: CSizePolicyType): boolean { return (policy & 2) !== 0; }
    /**
     * Tests whether a sizing policy ignores the preferred size.
     * @param policy Axis policy to inspect.
     * @returns `true` if the ignore-hint flag is set.
     */
    static ignoresHint(policy: CSizePolicyType): boolean { return (policy & 8) !== 0; }
}
