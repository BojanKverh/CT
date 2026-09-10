/** Implements the list widget item widget. */
export class CListWidgetItem
{
	#m_text = "";
	#m_enabled = true;

	/** Creates a new instance. */
	constructor(text = "")
	{
		this.#m_text = text;
	}

	/** Provides text behavior. */
	text(): string
	{
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void
	{
		this.#m_text = text;
	}

	/** Returns whether the enabled condition is active. */
	isEnabled(): boolean
	{
		return this.#m_enabled;
	}

	/** Sets the enabled. */
	setEnabled(enabled: boolean): void
	{
		this.#m_enabled = enabled;
	}
}