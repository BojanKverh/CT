import { CStyleOption } from "./CStyleOption.js";
import type { CProgressBar } from "../widgets/CProgressBar.js";

/**
 * Contains style information used to render a progress bar.
 */
export class CStyleOptionProgressBar extends CStyleOption {
		/**
	 * Returns or updates the minimum value.
	 */
minimum = 0;
		/**
	 * Returns or updates the maximum value.
	 */
maximum = 100;
		/**
	 * Returns or updates the value value.
	 */
value = 0;

		/**
	 * Creates a new CStyleOptionProgressBar instance.
	 *
	 * @param other Other.
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