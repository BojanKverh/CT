import { CObject } from "./CObject.js";

/**
 * Container for data represented by MIME type.
 */
export class CMimeData extends CObject {
	#m_data = new Map<string, Uint8Array>();

/**
 * Creates an empty MIME data container.
 * @param parent Parent object, or `null` for no parent.
 */
	constructor(parent: CObject | null = null) {
		super(parent);
	}

/**
 * Returns all MIME types currently stored.
 * @returns Array of MIME type strings.
 */
	formats(): string[] {
		return [...this.#m_data.keys()];
	}

/**
 * Checks whether data exists for a MIME type.
 * @param mimeType MIME type to test.
 * @returns `true` if the format is present.
 */
	hasFormat(mimeType: string): boolean {
		return this.#m_data.has(mimeType);
	}

/**
 * Returns a copy of the data stored for a MIME type.
 * @param mimeType MIME type to retrieve.
 * @returns Stored bytes, or an empty array if the format is absent.
 */
	data(mimeType: string): Uint8Array {
		const data = this.#m_data.get(mimeType);

		if (data === undefined)
			return new Uint8Array();

		return data.slice();
	}

/**
	 * Stores a copy of the binary payload. An empty MIME type is ignored.
	 * @param mimeType Nonempty MIME type under which to store the payload.
	 * @param data Bytes to copy into the container.
	 */
	setData(mimeType: string, data: Uint8Array): void {
		if (mimeType.length === 0)
			return;

		this.#m_data.set(mimeType, data.slice());
	}

/**
 * Removes data for a MIME type.
 * @param mimeType MIME type to remove.
 */
	removeFormat(mimeType: string): void {
		this.#m_data.delete(mimeType);
	}

/**
 * Removes all stored MIME data.
 */
	clear(): void {
		this.#m_data.clear();
	}

/**
 * Checks whether plain-text data is available.
 * @returns `true` if `text/plain` data is present.
 */
	hasText(): boolean {
		return this.hasFormat("text/plain");
	}

/**
 * Returns the stored plain text.
 * @returns Decoded plain text, or an empty string if unavailable.
 */
	text(): string {
		const data = this.#m_data.get("text/plain");

		if (data === undefined)
			return "";

		return new TextDecoder().decode(data);
	}

/**
 * Stores plain text using the `text/plain` MIME type.
 * @param text Text to store.
 */
	setText(text: string): void {
		this.setData("text/plain", new TextEncoder().encode(text));
	}
}