import { CStyleOption, CStyleState } from "./CStyleOption.js";
import type { CComboBox } from "../widgets/CComboBox.js";

export class CStyleOptionComboBox extends CStyleOption {
	arrowHovered = false;

	constructor(other: CStyleOptionComboBox | null = null) {
		super(other);

		if (other === null)
			return;

		this.arrowHovered = other.arrowHovered;
	}

	initFromComboBox(comboBox: CComboBox): void {
		this.initFrom(comboBox);

		this.arrowHovered = comboBox.isArrowHovered();

		if (comboBox.isDown())
			this.state |= CStyleState.Sunken;
	}
}