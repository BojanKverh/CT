/** Implements the table widget item widget. */
export class CTableWidgetItem {
	#m_text: string;

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
}