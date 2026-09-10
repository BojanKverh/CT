import { CSize } from "../geometry/CSize.js";
import { CIcon } from "./CIcon.js";
import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CToolButtonStyle } from "./CToolButtonStyle.js";
import { CStyleState } from "./CStyleOption.js";
import type { CToolButton } from "../widgets/CToolButton.js";

/**
 * Contains style information used to render a tool button.
 */
export class CStyleOptionToolButton extends CStyleOptionButton {
		/**
	 * Returns or updates the text value.
	 */
text = "";
		/**
	 * Returns or updates the icon value.
	 */
icon: CIcon | null = null;
		/**
	 * Returns the icon size used by the style.
	 */
iconSize = new CSize(16, 16);
		/**
	 * Returns or updates the tool button style value.
	 */
toolButtonStyle = CToolButtonStyle.IconOnly;
        /**
     * Returns or updates the auto raise value.
     */
autoRaise = false;
	
		/**
	 * Creates a new CStyleOptionToolButton instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionToolButton | null = null) {
		super(other);

		if (other === null)
			return;

		this.text = other.text;
		this.icon = other.icon;
		this.iconSize = new CSize(
			other.iconSize.width(), other.iconSize.height()
		);
		this.toolButtonStyle = other.toolButtonStyle;
        this.autoRaise = other.autoRaise;
	}

		/**
	 * Initializes this style option from the specified tool button.
	 *
	 * @param button Button.
	 */
initFromToolButton(button: CToolButton): void {
		this.initFromButton(button);

		this.text = button.text();
		this.icon = button.icon();
		this.iconSize = button.iconSize();
		this.toolButtonStyle = button.toolButtonStyle();
		this.autoRaise = button.autoRaise();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;
	}
}