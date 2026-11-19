/** @module GUI/CStyleOptionSizeGrip */
import { CStyleOption } from "./CStyleOption.js";
import type { CSizeGrip } from "../widgets/CSizeGrip.js";

/**
 * Contains style information used to render a size grip.
 */
export class CStyleOptionSizeGrip extends CStyleOption {
    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionSizeGrip | null = null) {
		super(other);
	}

    /**
    * Initializes this style option from the specified size grip.
    *
    * @param sizeGrip Size grip.
    */
    initFromSizeGrip(sizeGrip: CSizeGrip): void {
		this.initFrom(sizeGrip);
	}
}