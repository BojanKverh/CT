import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";

export abstract class CAbstractButton extends CWidget {
	#m_text = "";
	#m_checkable = false;
	#m_checked = false;

	readonly clicked = new CSignal<[]>();
	readonly toggled = new CSignal<[boolean]>();

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

	isCheckable(): boolean {
		return this.#m_checkable;
	}

	setCheckable(checkable: boolean): void {
		if (this.#m_checkable === checkable)
			return;

		this.#m_checkable = checkable;

		if (!checkable && this.#m_checked) {
			this.#m_checked = false;
			this.toggled.emit(false);
		}

		this.update();
	}

	isChecked(): boolean {
		return this.#m_checked;
	}

	setChecked(checked: boolean): void {
		if (!this.#m_checkable || this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(this.#m_checked);
		this.update();
	}

	toggle(): void {
		if (!this.#m_checkable)
			return;

		this.setChecked(!this.#m_checked);
	}
}
