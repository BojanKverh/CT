import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CRadioButton } from "../widgets/CRadioButton.js";

/**
 * Contains style information used to render a radio button.
 */
export class CStyleOptionRadioButton extends CStyleOptionButton {
		/**
	 * Returns or updates the text value.
	 */
text = "";

		/**
	 * Creates a new CStyleOptionRadioButton instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionRadioButton | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
	}

		/**
	 * Initializes this style option from the specified radio button.
	 *
	 * @param radioButton Radio button.
	 */
initFromRadioButton(radioButton: CRadioButton): void {
		this.initFromButton(radioButton);
		this.text = radioButton.text();
	}
}