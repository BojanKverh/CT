import { CSignal } from "./CSignal.js";

export class CAction {
	#m_text: string;
	#m_enabled = true;
	#m_checkable = false;
	#m_checked = false;

	readonly triggered = new CSignal<[]>();
	readonly toggled = new CSignal<[boolean]>();

	constructor(text = "") {
		this.#m_text = text;
	}

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		this.#m_text = text;
	}

	isEnabled(): boolean {
		return this.#m_enabled;
	}

	setEnabled(enabled: boolean): void {
		this.#m_enabled = enabled;
	}

	isCheckable(): boolean {
		return this.#m_checkable;
	}

	setCheckable(checkable: boolean): void {
		this.#m_checkable = checkable;

		if (!checkable)
			this.setChecked(false);
	}

	isChecked(): boolean {
		return this.#m_checked;
	}

	setChecked(checked: boolean): void {
		if (!this.#m_checkable)
			checked = false;

		if (this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(checked);
	}

	trigger(): void {
		if (!this.#m_enabled)
			return;

		if (this.#m_checkable)
			this.setChecked(!this.#m_checked);

		this.triggered.emit();
	}
}