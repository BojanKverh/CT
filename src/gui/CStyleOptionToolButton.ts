import { CSize } from "../geometry/CSize.js";
import { CIcon } from "./CIcon.js";
import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CToolButtonStyle } from "./CToolButtonStyle.js";
import { CStyleState } from "./CStyleOption.js";
import type { CToolButton } from "../widgets/CToolButton.js";

export class CStyleOptionToolButton extends CStyleOptionButton {
	text = "";
	icon: CIcon | null = null;
	iconSize = new CSize(16, 16);
	toolButtonStyle = CToolButtonStyle.IconOnly;
    autoRaise = false;
	
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