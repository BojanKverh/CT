import { CStyleOptionButton } from "./CStyleOptionButton.js";
import { CStyleState } from "./CStyleOption.js";
import type { CToolBoxButton } from "../widgets/CToolBoxButton.js";

/**
 * Contains style information used to render a tool box button.
 */
export class CStyleOptionToolBoxButton extends CStyleOptionButton {
		/**
	 * Returns or updates the text value.
	 */
text = "";
		/**
	 * Returns or updates the current value.
	 */
current = false;

		/**
	 * Creates a new CStyleOptionToolBoxButton instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOptionToolBoxButton | null = null) {
		super(other);

		if (other) {
			this.text = other.text;
			this.current = other.current;
		}
	}

		/**
	 * Initializes this style option from the specified tool box button.
	 *
	 * @param button Button.
	 */
initFromToolBoxButton(button: CToolBoxButton): void {
		this.initFromButton(button);

		this.text = button.text();
		this.current = button.isCurrent();

		if (button.isHovered())
			this.state |= CStyleState.MouseOver;

		if (button.isDown())
			this.state |= CStyleState.Sunken;
	}
}