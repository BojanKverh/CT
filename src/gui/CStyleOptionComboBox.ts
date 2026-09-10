import { CStyleOption, CStyleState } from "./CStyleOption.js";
import type { CComboBox } from "../widgets/CComboBox.js";

/**
 * Contains style information used to render a combo box.
 */
export class CStyleOptionComboBox extends CStyleOption {
		/**
	 * Returns or updates the arrow hovered value.
	 */
arrowHovered = false;

		/**
	 * Creates a new CStyleOptionComboBox instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionComboBox | null = null) {
		super(other);

		if (other === null)
			return;

		this.arrowHovered = other.arrowHovered;
	}

		/**
	 * Initializes this style option from the specified combo box.
	 *
	 * @param comboBox Combo box.
	 */
initFromComboBox(comboBox: CComboBox): void {
		this.initFrom(comboBox);

		this.arrowHovered = comboBox.isArrowHovered();

		if (comboBox.isDown())
			this.state |= CStyleState.Sunken;
	}
}