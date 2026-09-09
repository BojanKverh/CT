import { CStyleOption } from "./CStyleOption.js";
import type { CGroupBox } from "../widgets/CGroupBox.js";

export class CStyleOptionGroupBox extends CStyleOption {
	title = "";

	constructor(other: CStyleOptionGroupBox | null = null) {
		super(other);

		if (other)
			this.title = other.title;
	}

	initFromGroupBox(groupBox: CGroupBox): void {
		this.initFrom(groupBox);

		this.title = groupBox.title();
	}
}