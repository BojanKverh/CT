/** @module GUI/CStyleOptionCheckBox */
import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";

/**
 * Contains style information used to render a check box.
 */
export class CStyleOptionCheckBox extends CStyleOptionButton {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
    */
    constructor(other: CStyleOptionCheckBox | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
	}

    /**
    * Initializes this style option from the specified check box.
    *
    * @param checkBox Check box.
    */
    initFromCheckBox(checkBox: CCheckBox): void {
		this.initFromButton(checkBox);
		this.text = checkBox.text();
	}
}