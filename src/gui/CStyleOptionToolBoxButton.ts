import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CToolBoxButton } from "../widgets/CToolBoxButton.js";

export class CStyleOptionToolBoxButton extends CStyleOptionButton {
	text = "";
	current = false;

	constructor(other: CStyleOptionToolBoxButton | null = null) {
		super(other);

		if (other) {
			this.text = other.text;
			this.current = other.current;
		}
	}

	initFromToolBoxButton(button: CToolBoxButton): void {
		this.initFromButton(button);

		this.text = button.text();
		this.current = button.isCurrent();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;
	}
}