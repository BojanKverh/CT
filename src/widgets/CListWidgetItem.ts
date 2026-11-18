import type { CIcon } from "../gui/CIcon.js";
import { CSignal } from "../core/CSignal.js";
/** Implements the list widget item widget. */
export class CListWidgetItem
{
	#m_text = "";
    #m_icon: CIcon | null = null;
    readonly changed = new CSignal<[]>();
	#m_enabled = true;

	/** Creates a new instance. */
	constructor(text = "", icon: CIcon | null = null)
	{
		this.#m_text = text;
        this.#m_icon = icon;
	}

    /**
     * Reads the icon.
     * @returns The icon.
     */
    icon(): CIcon | null { return this.#m_icon; }
    /**
     * Sets the icon. May emit `changed`.
     * @param icon Icon.
     */
    setIcon(icon: CIcon | null): void {
        if (this.#m_icon === icon) return;
        this.#m_icon = icon; this.changed.emit();
    }

	/**
	 * Reads the text.
	 * @returns The text.
	 */
	text(): string
	{
		return this.#m_text;
	}

	/**
	 * Changes the item caption and emits `changed` if it differs.
	 * @param text New display caption.
	 */
	setText(text: string): void
	{
        if (this.#m_text === text) return;
		this.#m_text = text; this.changed.emit();
	}

	/**
	 * Checks whether the list widget item is enabled.
	 * @returns `true` if the list widget item is enabled, otherwise `false`.
	 */
	isEnabled(): boolean
	{
		return this.#m_enabled;
	}

	/**
	 * Sets the enabled.
	 * @param enabled Whether to enable the feature.
	 */
	setEnabled(enabled: boolean): void
	{
		if (this.#m_enabled === enabled) return;
        this.#m_enabled = enabled; this.changed.emit();
	}
}