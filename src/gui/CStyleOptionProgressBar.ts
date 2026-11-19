/** @module GUI/CStyleOptionProgressBar */
import { CStyleOption } from "./CStyleOption.js";
import type { CProgressBar } from "../widgets/CProgressBar.js";

/**
 * Contains style information used to render a progress bar.
 */
export class CStyleOptionProgressBar extends CStyleOption {
    /**
    * Lower endpoint used to map the numeric range to a painted position.
    */
    minimum = 0;
    /**
    * Upper endpoint used to map the numeric range to a painted position.
    */
    maximum = 100;
    /**
    * Numeric position within the configured range used for painting.
    */
    value = 0;

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionProgressBar | null = null) {
		super(other);

		if (other === null)
			return;

		this.minimum = other.minimum;
		this.maximum = other.maximum;
		this.value = other.value;
	}

    /**
    * Initializes this style option from the specified progress bar.
    *
    * @param progressBar Progress bar.
    */
    initFromProgressBar(progressBar: CProgressBar): void {
		this.initFrom(progressBar);

		this.minimum = progressBar.minimum();
		this.maximum = progressBar.maximum();
		this.value = progressBar.value();
	}
}