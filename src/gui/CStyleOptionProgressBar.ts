import { CStyleOption } from "./CStyleOption.js";
import type { CProgressBar } from "../widgets/CProgressBar.js";

export class CStyleOptionProgressBar extends CStyleOption {
	minimum = 0;
	maximum = 100;
	value = 0;

	constructor(other: CStyleOptionProgressBar | null = null) {
		super(other);

		if (other === null)
			return;

		this.minimum = other.minimum;
		this.maximum = other.maximum;
		this.value = other.value;
	}

	initFromProgressBar(progressBar: CProgressBar): void {
		this.initFrom(progressBar);

		this.minimum = progressBar.minimum();
		this.maximum = progressBar.maximum();
		this.value = progressBar.value();
	}
}