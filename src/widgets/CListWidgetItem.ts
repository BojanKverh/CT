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

    icon(): CIcon | null { return this.#m_icon; }
    setIcon(icon: CIcon | null): void {
        if (this.#m_icon === icon) return;
        this.#m_icon = icon; this.changed.emit();
    }

	/** Provides text behavior. */
	text(): string
	{
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void
	{
        if (this.#m_text === text) return;
		this.#m_text = text; this.changed.emit();
	}

	/** Returns whether the enabled condition is active. */
	isEnabled(): boolean
	{
		return this.#m_enabled;
	}

	/** Sets the enabled. */
	setEnabled(enabled: boolean): void
	{
		if (this.#m_enabled === enabled) return;
        this.#m_enabled = enabled; this.changed.emit();
	}
}