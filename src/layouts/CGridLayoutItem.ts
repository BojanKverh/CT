import { CLayoutItem } from "./CLayoutItem.js";
import type { CWidget } from "../widgets/CWidget.js";

export class CGridLayoutItem extends CLayoutItem
{
	#m_widget: CWidget;
	#m_row: number;
	#m_column: number;
	#m_rowSpan: number;
	#m_columnSpan: number;

	constructor(
		widget: CWidget,
		row: number,
		column: number,
		rowSpan = 1,
		columnSpan = 1
	) {
		super();

		this.#m_widget = widget;
		this.#m_row = row;
		this.#m_column = column;
		this.#m_rowSpan = rowSpan;
		this.#m_columnSpan = columnSpan;
	}

	override widget(): CWidget {
		return this.#m_widget;
	}

	row(): number {
		return this.#m_row;
	}

	column(): number {
		return this.#m_column;
	}

	rowSpan(): number {
		return this.#m_rowSpan;
	}

	columnSpan(): number {
		return this.#m_columnSpan;
	}
}