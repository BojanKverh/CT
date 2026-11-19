/** @module Widgets/CListWidgetItem */
import type { CIcon } from "../gui/CIcon.js";
import { CSignal } from "../core/CSignal.js";
/** Text and presentation metadata for an entry owned by a CListWidget. */
export class CListWidgetItem
{
	#m_text = "";
    #m_icon: CIcon | null = null;
    /**
    * Emitted after text, graphic or enabled state changes; owning lists use it to refresh presentation.
    * @group Signals
    */
    readonly changed = new CSignal<[]>();
	#m_enabled = true;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param text Initial plain-text caption or cell contents. Omit to use `""`.
    * @param icon Input used to configure CListWidgetItem. Omit to use `null`.
    */
    constructor(text = "", icon: CIcon | null = null)
	{
		this.#m_text = text;
        this.#m_icon = icon;
	}

    /**
    * Assigned icon used by the control's drawing style.
    * The initial value is `null`.
    */
    icon(): CIcon | null { return this.#m_icon; }
    /**
    * Replaces the item graphic and emits changed so attached views can repaint.
    */
    setIcon(icon: CIcon | null): void {
        if (this.#m_icon === icon) return;
        this.#m_icon = icon; this.changed.emit();
    }

    /**
    * Stored caption or text value.
    * The initial value is `""`.
    */
    text(): string
	{
		return this.#m_text;
	}

    /**
    * Changes the item's caption and notifies its owning list when attached.
    */
    setText(text: string): void
	{
        if (this.#m_text === text) return;
		this.#m_text = text; this.changed.emit();
	}

    /**
    * Whether the item can participate in enabled item interaction.
    */
    isEnabled(): boolean
	{
		return this.#m_enabled;
	}

    /**
    * Controls item activation eligibility and disabled-state painting.
    */
    setEnabled(enabled: boolean): void
	{
		if (this.#m_enabled === enabled) return;
        this.#m_enabled = enabled; this.changed.emit();
	}
}