import { CLayoutItem } from "./CLayoutItem.js";
import type { CWidget } from "../widgets/CWidget.js";

/**
 * Layout item that wraps a widget.
 */
export class CWidgetItem extends CLayoutItem {
	#m_widget: CWidget | null;

	/**
	 * Creates a layout item for the specified widget.
	 *
	 * @param widget Widget represented by the item, or `null`.
	 */
	constructor(widget: CWidget | null) {
		super();

		this.#m_widget = widget;
	}

	/**
	 * Looks up the widget wrapped by this item.
	 * @returns The widget supplied at construction, or `null`.
	 */
	override widget(): CWidget | null {
		return this.#m_widget;
	}
}
