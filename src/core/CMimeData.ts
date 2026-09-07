import { CObject } from "./CObject.js";

export class CMimeData extends CObject {
	#m_data = new Map<string, Uint8Array>();

	constructor(parent: CObject | null = null) {
		super(parent);
	}

	formats(): string[] {
		return [...this.#m_data.keys()];
	}

	hasFormat(mimeType: string): boolean {
		return this.#m_data.has(mimeType);
	}

	data(mimeType: string): Uint8Array {
		const data = this.#m_data.get(mimeType);

		if (data === undefined)
			return new Uint8Array();

		return data.slice();
	}

	setData(mimeType: string, data: Uint8Array): void {
		if (mimeType.length === 0)
			return;

		this.#m_data.set(mimeType, data.slice());
	}

	removeFormat(mimeType: string): void {
		this.#m_data.delete(mimeType);
	}

	clear(): void {
		this.#m_data.clear();
	}

	hasText(): boolean {
		return this.hasFormat("text/plain");
	}

	text(): string {
		const data = this.#m_data.get("text/plain");

		if (data === undefined)
			return "";

		return new TextDecoder().decode(data);
	}

	setText(text: string): void {
		this.setData("text/plain", new TextEncoder().encode(text));
	}
}