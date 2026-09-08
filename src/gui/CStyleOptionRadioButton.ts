import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CRadioButton } from "../widgets/CRadioButton.js";

export class CStyleOptionRadioButton extends CStyleOptionButton {
	text = "";

	constructor(other: CStyleOptionRadioButton | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
	}

	initFromRadioButton(radioButton: CRadioButton): void {
		this.initFromButton(radioButton);
		this.text = radioButton.text();
	}
}