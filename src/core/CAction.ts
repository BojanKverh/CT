import { CSignal } from "./CSignal.js";
import { CIcon } from "../gui/CIcon.js";

/**
 * Represents a reusable user action with text, icon, enabled and checked state.
 */
export class CAction {
	#m_text: string;
	#m_icon: CIcon | null = null;
	#m_enabled = true;
	#m_checkable = false;
	#m_checked = false;
	
/**
 * Emitted when an action property changes.
 */
	readonly changed = new CSignal<[]>();
/**
 * Emitted when the action is triggered.
 */
	readonly triggered = new CSignal<[]>();
/**
 * Emitted when the checked state changes.
 * @param checked New checked state.
 */
	readonly toggled = new CSignal<[boolean]>();

/**
 * Creates an action.
 * @param text Initial display text.
 */
	constructor(text = "") {
		this.#m_text = text;
	}

/**
 * Returns the action text.
 * @returns Current display text.
 */
	text(): string {
		return this.#m_text;
	}

/**
 * Sets the action text.
 * @param text New display text.
 */
	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.changed.emit();
	}

/**
 * Returns the action icon.
 * @returns Current icon, or `null` if no icon is set.
 */
	icon(): CIcon | null {
		return this.#m_icon;
	}

/**
 * Sets the action icon.
 * @param icon New icon, or `null` to remove it.
 */
	setIcon(icon: CIcon | null): void {
		if (this.#m_icon === icon)
			return;

		this.#m_icon = icon;
		this.changed.emit();
	}

/**
 * Returns whether the action can be triggered.
 * @returns `true` if the action is enabled.
 */
	isEnabled(): boolean {
		return this.#m_enabled;
	}

/**
 * Sets whether the action can be triggered.
 * @param enabled New enabled state.
 */
	setEnabled(enabled: boolean): void {
		if (this.#m_enabled === enabled)
			return;

		this.#m_enabled = enabled;
		this.changed.emit();
	}

/**
 * Returns whether the action has a checked state.
 * @returns `true` if the action is checkable.
 */
	isCheckable(): boolean {
		return this.#m_checkable;
	}

/**
 * Sets whether the action has a checked state. Disabling checkability also clears the checked state.
 * @param checkable New checkable state.
 */
	setCheckable(checkable: boolean): void {
		if (this.#m_checkable === checkable)
			return;

		this.#m_checkable = checkable;

		if (!checkable)
			this.setChecked(false);

		this.changed.emit();
	}

/**
 * Returns the current checked state.
 * @returns `true` if the action is checked.
 */
	isChecked(): boolean {
		return this.#m_checked;
	}

/**
 * Sets the checked state of a checkable action.
 * @param checked New checked state.
 */
	setChecked(checked: boolean): void {
		if (!this.#m_checkable)
			checked = false;

		if (this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(checked);
		this.changed.emit();
	}

/**
 * Triggers the action if it is enabled. Checkable actions toggle their checked state first.
 */
	trigger(): void {
		if (!this.#m_enabled)
			return;

		if (this.#m_checkable)
			this.setChecked(!this.#m_checked);

		this.triggered.emit();
	}
}