import { CStyleOption, CStyleState } from "./CStyleOption.js";
import type { CAbstractButton } from "../widgets/CAbstractButton.js";

/**
 * Contains style information used to render a button.
 */
export class CStyleOptionButton extends CStyleOption {
		/**
	 * Creates a new CStyleOptionButton instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionButton | null = null) {
		super(other);
	}

		/**
	 * Initializes this style option from the specified button.
	 *
	 * @param button Button.
	 */
initFromButton(button: CAbstractButton): void {
		this.initFrom(button);

		if (button.isChecked())
			this.state |= CStyleState.On;
	}
}