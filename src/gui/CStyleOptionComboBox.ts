/** @module GUI/CStyleOptionComboBox */
import { CStyleOption, CStyleState } from "./CStyleOption.js";
import type { CComboBox } from "../widgets/CComboBox.js";

/**
 * Contains style information used to render a combo box.
 */
export class CStyleOptionComboBox extends CStyleOption {
    /**
    * Whether the pointer is over the drop-down arrow rather than the text editor.
    */
    arrowHovered = false;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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