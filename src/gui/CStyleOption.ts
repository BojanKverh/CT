import { CRect } from "../geometry/CRect.js";
import { CPalette } from "./CPalette.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CFont } from "./CFont.js";

/**
 * Defines state flags passed to style drawing operations.
 */
export enum CStyleState {
		/**
	 * No flags or special state.
	 */
None = 0,
		/**
	 * The widget is enabled.
	 */
Enabled = 1 << 0,
		/**
	 * The widget is active.
	 */
Active = 1 << 1,
		/**
	 * The pointer is over the widget.
	 */
MouseOver = 1 << 2,
		/**
	 * The control is pressed or sunken.
	 */
Sunken = 1 << 3,
		/**
	 * The control is in the on state.
	 */
On = 1 << 4,
		/**
	 * The widget has keyboard focus.
	 */
HasFocus = 1 << 5,
		/**
	 * Selected appearance.
	 */
Selected = 1 << 6
}

/**
 * Contains common state passed from a widget to a style drawing operation.
 */
export class CStyleOption {
		/**
	 * Returns or updates the rect value.
	 */
rect = new CRect();
		/**
	 * Returns or updates the state value.
	 */
state = CStyleState.None;
		/**
	 * Returns or updates the palette value.
	 */
palette = new CPalette();
        /**
     * Returns the font used by these metrics.
     */
font = new CFont();

		/**
	 * Creates a new CStyleOption instance.
	 *
	 * @param other Other.
	 */
constructor(other: CStyleOption | null = null) {
		if (other === null)
			return;

		this.rect = new CRect(
			other.rect.x(), other.rect.y(),
			other.rect.width(), other.rect.height()
		);
		this.state = other.state;
		this.palette = new CPalette(other.palette);
	       	this.font = new CFont(other.font);
	}

        /**
     * Initializes this style option from a widget.
     *
     * @param widget Widget.
     */
initFrom(widget: CWidget): void {
		this.rect = widget.rect();
		this.palette = widget.palette();

		this.state = CStyleState.None;

		if (widget.isEnabled())
			this.state |= CStyleState.Enabled;

		if (widget.hasFocus())
			this.state |= CStyleState.HasFocus;

        this.font = widget.font();
	}
}
