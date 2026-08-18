import { CLayoutItem } from "./CLayoutItem.js";
import type { CWidget } from "../widgets/CWidget.js";

export class CWidgetItem extends CLayoutItem {
	#m_widget: CWidget | null;

	constructor(widget: CWidget | null) {
		super();

		this.#m_widget = widget;
	}

	override widget(): CWidget | null {
		return this.#m_widget;
	}
}