/** @module GUI/CStyleOptionPushButton */
import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CIcon } from "./CIcon.js";
import type { CPushButton } from "../widgets/CPushButton.js";

/**
 * Placement of a push button graphic relative to its caption.
 */
export enum CIconPosition {
    /**
    * Paint the graphic before the caption.
    */
    Left,
    /**
    * Paint the graphic after the caption.
    */
    Right
}

/**
 * Contains style information used to render a push button.
 */
export class CStyleOptionPushButton extends CStyleOptionButton {
    /**
    * Caption painted by the style; an empty string draws no caption.
    */
    text = "";

    /** Logical corner radius used for button framing. */
    radius: number = 3;
    /** Whether default-action framing is requested. */
    defaultButton = false;
    /** Logical icon box size used by push-button layout. */
    static readonly IconExtent = 16;
    /** Logical gap between the icon box and a non-empty caption. */
    static readonly IconSpacing = 6;
    /**
    * Optional graphic painted with the caption; null omits the graphic.
    */
    icon: CIcon | null = null;
    /** Side on which the icon is painted relative to its caption. */
    iconPosition = CIconPosition.Left;

    /**
    * Copies the paint options from other, or initializes the default appearance when other is null.
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