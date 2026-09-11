/** Implements the table widget item widget. */
export class CTableWidgetItem {
	#m_text: string;
	#m_editable = true;

	/** Creates a new instance. */
	constructor(text: string = "") {
		this.#m_text = text;
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void {
		this.#m_text = text;
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