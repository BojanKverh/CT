import { CStyleOption, CStyleState } from "./CStyleOption.js";
import type { CAbstractButton } from "../widgets/CAbstractButton.js";

export class CStyleOptionButton extends CStyleOption {
	constructor(other: CStyleOptionButton | null = null) {
		super(other);
	}

	initFromButton(button: CAbstractButton): void {
		this.initFrom(button);

		if (button.isChecked())
			this.state |= CStyleState.On;
	}
}