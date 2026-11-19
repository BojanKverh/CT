/** @module Core/CClipboard */
import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import { CMimeData } from "./CMimeData.js";

/**
 * Stores application clipboard data in MIME-based form.
 */
export class CClipboard extends CObject {
    /**
    * Emitted when the clipboard contents change.
    * @group Signals
    */
    readonly changed = new CSignal();
    /**
    * Emitted when the clipboard MIME data changes.
    * @group Signals
    */
    readonly dataChanged = new CSignal();

	#m_mimeData: CMimeData | null = null;
    #m_nativeDepth = 0;
    #m_lastError = "";
    #m_revision = 0;
    /**
    * Reports a denied or failed system clipboard operation.
    * @group Signals
    */
    readonly errorOccurred = new CSignal<[string]>();

    /**
    * Returns the last recorded system-clipboard failure, or null when no error is recorded.
    */
    lastError(): string { return this.#m_lastError; }

    /**
    * Reports whether the browser exposes a system text-read capability.
    */
    canReadSystemText(): boolean {
        return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
    }

    /** @internal Synchronizes a native clipboard event without writing it back. */
    withNativeClipboard(operation: () => void): void {
        ++this.#m_nativeDepth;
        try { operation(); } finally { --this.#m_nativeDepth; }
    }

    /** Reads current system text. A denied read returns null, never stale cached text. */
    async readSystemText(): Promise<string | null> {
        if (!this.canReadSystemText()) return this.text();
        const revision = this.#m_revision;
        try {
            const text = await navigator.clipboard.readText();
            if (revision !== this.#m_revision) return null;
            this.#m_lastError = "";
            this.withNativeClipboard(() => this.setText(text));
            return text;
        } catch (error) {
            this.#reportError(error);
            return null;
        }
    }

    /** Writes text to the system clipboard; local MIME data is managed separately. */
    async writeSystemText(text: string): Promise<boolean> {
        if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") return false;
        try {
            await navigator.clipboard.writeText(text);
            this.#m_lastError = "";
            return true;
        } catch (error) {
            this.#reportError(error);
            return false;
        }
    }

    #reportError(error: unknown): void {
        this.#m_lastError = error instanceof Error ? error.message : String(error);
        this.errorOccurred.emit(this.#m_lastError);
    }

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
    * Returns the toolkit clipboard's current MIME payload.
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
        ++this.#m_revision;

		if (mimeData !== null)
			mimeData.setParent(this);

        // Keep the synchronous CT API, while synchronizing explicit text writes.
        if (this.#m_nativeDepth === 0 && mimeData?.hasText()) void this.writeSystemText(mimeData.text());
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