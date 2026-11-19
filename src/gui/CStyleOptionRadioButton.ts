/** @module GUI/CStyleOptionRadioButton */
import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CRadioButton } from "../widgets/CRadioButton.js";

/**
 * Contains style information used to render a radio button.
 */
export class CStyleOptionRadioButton extends CStyleOptionButton {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
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