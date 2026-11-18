/** Implements the table widget item widget. */
export class CTableWidgetItem {
	#m_data: unknown;
	#m_editable = true;

	/** Creates a new instance. */
	constructor(data: unknown = "") {
		this.#m_data = data;
	}

	/**
	 * Reads the text of the table widget item.
	 * @returns The text.
	 */
	text(): string {
		return this.#m_data === null || this.#m_data === undefined
			? ""
			: String(this.#m_data);
	}

	/**
	 * Replaces the item's stored data with a string.
	 * @param text Text to store as the cell value.
	 */
	setText(text: string): void {
		this.#m_data = text;
	}

	/**
	 * Returns the value stored by the item.
	 * @returns The data.
	 */
	data(): unknown {
		return this.#m_data;
	}

	/**
	 * Sets the value stored by the item.
	 * @param data Data.
	 */
	setData(data: unknown): void {
		this.#m_data = data;
	}

	/**
	 * Returns whether the item can be edited.
	 * @returns `true` if the table widget item is editable, otherwise `false`.
	 */
	isEditable(): boolean {
		return this.#m_editable;
	}

	/**
	 * Sets whether the item can be edited.
	 * @param editable Editable flag. Defaults to `true`.
	 */
	setEditable(editable: boolean = true): void {
		this.#m_editable = editable;
	}
}
