export class CTableWidgetItem {
	#m_text: string;

	constructor(text: string = "") {
		this.#m_text = text;
	}

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		this.#m_text = text;
	}
}