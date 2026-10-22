import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CPushButton } from "../widgets/CPushButton.js";

/**
 * Contains style information used to render a push button.
 */
export class CStyleOptionPushButton extends CStyleOptionButton {
		/**
	 * Returns or updates the text value.
	 */
text = "";

radius: number = 3;
    defaultButton = false;

		/**
	 * Creates a new CStyleOptionPushButton instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionPushButton | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
        this.radius = other.radius;
        this.defaultButton = other.defaultButton;
	}

		/**
	 * Initializes this style option from the specified push button.
	 *
	 * @param button Button.
	 */
initFromPushButton(button: CPushButton): void {
		this.initFromButton(button);

		this.text = button.text();
        this.defaultButton = button.isDefault();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;

		this.radius = button.radius();
	}
}