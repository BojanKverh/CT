import { CStyleOptionButton } from "./CStyleOptionButton.js";
import type { CCheckBox } from "../widgets/CCheckBox.js";

/**
 * Contains style information used to render a check box.
 */
export class CStyleOptionCheckBox extends CStyleOptionButton {
		/**
	 * Returns or updates the text value.
	 */
text = "";

		/**
	 * Creates a new CStyleOptionCheckBox instance.
	 *
	 * @param other Other.
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