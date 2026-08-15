import { CLayoutItem } from "./CLayoutItem.js";
import type { CWidget } from "../widgets/CWidget.js";

export class CWidgetItem extends CLayoutItem {
	#m_widget: CWidget;

	constructor(widget: CWidget) {
		super();

		this.#m_widget = widget;
	}

	override widget(): CWidget {
		return this.#m_widget;
	}
}