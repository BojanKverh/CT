import { CStyleOption } from "./CStyleOption.js";
import type { CSlider } from "../widgets/CSlider.js";

/**
 * Contains style information used to render a slider.
 */
export class CStyleOptionSlider extends CStyleOption {
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
	 * Creates a new CStyleOptionSlider instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionSlider | null = null) {
		super(other);

		if (other === null)
			return;

		this.minimum = other.minimum;
		this.maximum = other.maximum;
		this.value = other.value;
	}

		/**
	 * Initializes this style option from the specified slider.
	 *
	 * @param slider Slider.
	 */
initFromSlider(slider: CSlider): void {
		this.initFrom(slider);

		this.minimum = slider.minimum();
		this.maximum = slider.maximum();
		this.value = slider.value();
	}
}