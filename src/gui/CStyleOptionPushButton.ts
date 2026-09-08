import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CPushButton } from "../widgets/CPushButton.js";

export class CStyleOptionPushButton extends CStyleOptionButton {
	text = "";

	constructor(other: CStyleOptionPushButton | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
	}

	initFromPushButton(button: CPushButton): void {
		this.initFromButton(button);

		this.text = button.text();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;
	}
}