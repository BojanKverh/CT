import { CStyleOption } from "./CStyleOption.js";
import type { CSizeGrip } from "../widgets/CSizeGrip.js";

/**
 * Contains style information used to render a size grip.
 */
export class CStyleOptionSizeGrip extends CStyleOption {
		/**
	 * Creates a new CStyleOptionSizeGrip instance.
	 *
	 * @param other Other.
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