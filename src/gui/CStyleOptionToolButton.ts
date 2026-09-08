import { CSize } from "../geometry/CSize.js";
import { CIcon } from "./CIcon.js";
import { CStyleOption } from "./CStyleOption.js";
import { CToolButtonStyle } from "./CToolButtonStyle.js";

export class CStyleOptionToolButton extends CStyleOption {
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
}