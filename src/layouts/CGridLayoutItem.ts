import { CLayoutItem } from "./CLayoutItem.js";
import type { CWidget } from "../widgets/CWidget.js";

/**
 * Layout item that stores a widget's position and span in a grid.
 */
export class CGridLayoutItem extends CLayoutItem
{
	#m_widget: CWidget;
	#m_row: number;
	#m_column: number;
	#m_rowSpan: number;
	#m_columnSpan: number;

	/**
	 * Creates a grid-layout item.
	 *
	 * @param widget Widget represented by the item.
	 * @param row Zero-based grid row.
	 * @param column Zero-based grid column.
	 * @param rowSpan Number of rows occupied by the widget.
	 * @param columnSpan Number of columns occupied by the widget.
	 */
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

	/** Returns the widget represented by this item. */
	override widget(): CWidget {
		return this.#m_widget;
	}

	/** Returns the zero-based row containing the item. */
	row(): number {
		return this.#m_row;
	}

	/** Returns the zero-based column containing the item. */
	column(): number {
		return this.#m_column;
	}

	/** Returns the number of rows occupied by the item. */
	rowSpan(): number {
		return this.#m_rowSpan;
	}

	/** Returns the number of columns occupied by the item. */
	columnSpan(): number {
		return this.#m_columnSpan;
	}
}
