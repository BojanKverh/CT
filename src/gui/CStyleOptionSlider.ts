/** @module GUI/CStyleOptionSlider */
import { CStyleOption } from "./CStyleOption.js";
import type { CSlider } from "../widgets/CSlider.js";

/**
 * Contains style information used to render a slider.
 */
export class CStyleOptionSlider extends CStyleOption {
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