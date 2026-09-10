import type { CWidget } from "../widgets/CWidget.js";

/**
 * Abstract base class for items managed by a layout.
 */
export abstract class CLayoutItem {
	/**
	 * Returns the widget represented by this layout item, or `null` if the
	 * item does not represent a widget.
	 */
	abstract widget(): CWidget | null;
}
