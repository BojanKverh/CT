import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";

export class CStyleOptionCheckBox extends CStyleOptionButton {
	text = "";

	constructor(other: CStyleOptionCheckBox | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
	}

	initFromCheckBox(checkBox: CCheckBox): void {
		this.initFromButton(checkBox);
		this.text = checkBox.text();
	}
}