export class CListWidgetItem
{
	#m_text = "";
	#m_enabled = true;

	constructor(text = "")
	{
		this.#m_text = text;
	}

	text(): string
	{
		return this.#m_text;
	}

	setText(text: string): void
	{
		this.#m_text = text;
	}

	isEnabled(): boolean
	{
		return this.#m_enabled;
	}

	setEnabled(enabled: boolean): void
	{
		this.#m_enabled = enabled;
	}
}