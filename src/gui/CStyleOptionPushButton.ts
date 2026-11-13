import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CIcon } from "./CIcon.js";
import type { CPushButton } from "../widgets/CPushButton.js";

export enum CIconPosition {
    Left,
    Right
}

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
    static readonly IconExtent = 16;
    static readonly IconSpacing = 6;
    icon: CIcon | null = null;
    iconPosition = CIconPosition.Left;

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
        this.icon = other.icon;
        this.iconPosition = other.iconPosition;
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
        this.icon = button.icon();
        this.iconPosition = button.iconPosition();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;

		this.radius = button.radius();
	}
}