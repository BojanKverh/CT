import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import { CMimeData } from "./CMimeData.js";

/**
 * Stores application clipboard data in MIME-based form.
 */
export class CClipboard extends CObject {
/**
 * Emitted when the clipboard contents change.
 */
	readonly changed = new CSignal();
/**
 * Emitted when the clipboard MIME data changes.
 */
	readonly dataChanged = new CSignal();

	#m_mimeData: CMimeData | null = null;

	static #m_instance: CClipboard | null = null;

/**
 * Creates the clipboard instance.
 * @param parent Parent object, or `null` for no parent.
 */
	constructor(parent: CObject | null = null) {
		super(parent);

		CClipboard.#m_instance = this;
	}

/**
 * Returns the current clipboard instance.
 * @returns The current clipboard instance.
 * @throws Error if no clipboard instance exists.
 */
	static instance(): CClipboard {
		if (CClipboard.#m_instance === null)
			throw new Error("CClipboard instance does not exist.");

		return CClipboard.#m_instance;
	}

/**
 * Clears the global clipboard instance reference.
 */
	static destroy(): void {
		CClipboard.#m_instance = null;
	}

/**
 * Returns the current MIME data.
 * @returns Clipboard MIME data, or `null` when the clipboard is empty.
 */
	mimeData(): CMimeData | null {
		return this.#m_mimeData;
	}

/**
 * Replaces the clipboard contents with MIME data.
 * @param mimeData MIME data to store, or `null` to clear the clipboard.
 */
	setMimeData(mimeData: CMimeData | null): void {
		if (mimeData === this.#m_mimeData)
			return;

		if (this.#m_mimeData !== null)
			this.#m_mimeData.destroy();

		this.#m_mimeData = mimeData;

		if (mimeData !== null)
			mimeData.setParent(this);

		this.dataChanged.emit();
		this.changed.emit();
	}

/**
 * Returns the clipboard plain text.
 * @returns Plain text, or an empty string when no text is available.
 */
	text(): string {
		return this.#m_mimeData?.text() ?? "";
	}

/**
 * Replaces the clipboard contents with plain text.
 * @param text Text to store.
 */
	setText(text: string): void {
		const mimeData = new CMimeData();
		mimeData.setText(text);
		this.setMimeData(mimeData);
	}

/**
 * Clears the clipboard contents.
 */
	clear(): void {
		this.setMimeData(null);
	}
}