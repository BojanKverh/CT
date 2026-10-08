/** Implements the table widget item widget. */
export class CTableWidgetItem {
	#m_data: unknown;
	#m_editable = true;

	/** Creates a new instance. */
	constructor(data: unknown = "") {
		this.#m_data = data;
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_data === null || this.#m_data === undefined
			? ""
			: String(this.#m_data);
	}

	/** Sets the text. */
	setText(text: string): void {
		this.#m_data = text;
	}

	/** Returns the value stored by the item. */
	data(): unknown {
		return this.#m_data;
	}

	/** Sets the value stored by the item. */
	setData(data: unknown): void {
		this.#m_data = data;
	}

	/** Returns whether the item can be edited. */
	isEditable(): boolean {
		return this.#m_editable;
	}

	/** Sets whether the item can be edited. */
	setEditable(editable: boolean = true): void {
		this.#m_editable = editable;
	}
}
