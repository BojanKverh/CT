import { CSignal } from "./CSignal.js";

export class CAction {
	#m_text: string;
	#m_enabled = true;
	#m_checkable = false;
	#m_checked = false;

	readonly changed = new CSignal<[]>();
	readonly triggered = new CSignal<[]>();
	readonly toggled = new CSignal<[boolean]>();

	constructor(text = "") {
		this.#m_text = text;
	}

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.changed.emit();
	}

	isEnabled(): boolean {
		return this.#m_enabled;
	}

	setEnabled(enabled: boolean): void {
		if (this.#m_enabled === enabled)
			return;

		this.#m_enabled = enabled;
		this.changed.emit();
	}

	isCheckable(): boolean {
		return this.#m_checkable;
	}

	setCheckable(checkable: boolean): void {
		if (this.#m_checkable === checkable)
			return;

		this.#m_checkable = checkable;

		if (!checkable)
			this.setChecked(false);

		this.changed.emit();
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
		this.changed.emit();
	}

	trigger(): void {
		if (!this.#m_enabled)
			return;

		if (this.#m_checkable)
			this.setChecked(!this.#m_checked);

		this.triggered.emit();
	}
}