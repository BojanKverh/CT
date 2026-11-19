/** @module GUI/CStyleOptionToolButton */
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
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";
    /**
    * Optional graphic painted with the caption; null omits the graphic.
    */
    icon: CIcon | null = null;
    /**
    * Logical pixel dimensions reserved for the button graphic.
    */
    iconSize = new CSize(16, 16);
    /**
    * Chooses icon-only, text-only or combined icon and caption presentation.
    */
    toolButtonStyle = CToolButtonStyle.IconOnly;
    /**
    * Whether the style suppresses the normal button frame until hover or press.
    */
    autoRaise = false;

    /**
    * Copies the paint options from other, or initializes default appearance when other is null.
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