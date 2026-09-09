import { CStyleOption } from "./CStyleOption.js";
import type { CSlider } from "../widgets/CSlider.js";

export class CStyleOptionSlider extends CStyleOption {
	minimum = 0;
	maximum = 100;
	value = 0;

	constructor(other: CStyleOptionSlider | null = null) {
		super(other);

		if (other === null)
			return;

		this.minimum = other.minimum;
		this.maximum = other.maximum;
		this.value = other.value;
	}

	initFromSlider(slider: CSlider): void {
		this.initFrom(slider);

		this.minimum = slider.minimum();
		this.maximum = slider.maximum();
		this.value = slider.value();
	}
}