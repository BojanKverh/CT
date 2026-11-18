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

	/**
	 * Looks up the widget stored in the grid item.
	 * @returns The represented widget.
	 */
	override widget(): CWidget {
		return this.#m_widget;
	}

	/**
	 * Reads the row at which the item starts.
	 * @returns The stored zero-based starting row.
	 */
	row(): number {
		return this.#m_row;
	}

	/**
	 * Reads the column at which the item starts.
	 * @returns The stored zero-based starting column.
	 */
	column(): number {
		return this.#m_column;
	}

	/**
	 * Reads the vertical extent measured in cells.
	 * @returns The stored number of occupied rows.
	 */
	rowSpan(): number {
		return this.#m_rowSpan;
	}

	/**
	 * Reads the horizontal extent measured in cells.
	 * @returns The stored number of occupied columns.
	 */
	columnSpan(): number {
		return this.#m_columnSpan;
	}
}
