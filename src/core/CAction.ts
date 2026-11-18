import { CSignal } from "./CSignal.js";
import { CIcon } from "../gui/CIcon.js";
import { CShortcut } from "./CShortcut.js";
import type { CWidget } from "../widgets/CWidget.js";

/**
 * Represents a reusable user action with text, icon, enabled and checked state.
 */
export class CAction {
	#m_text: string;
	#m_icon: CIcon | null = null;
	#m_enabled = true;
	#m_checkable = false;
	#m_checked = false;
	#m_shortcutKey = "";
	#m_shortcutParent: CWidget | null = null;
	#m_shortcut: CShortcut | null = null;
	
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
	constructor(text = "", shortcutParent: CWidget | null = null) {
		this.#m_text = text;
		this.#m_shortcutParent = shortcutParent;
	}

	/**
	 * Reads the configured keyboard sequence for the action.
	 * @returns The normalized sequence, or an empty string when none is configured.
	 */
	shortcut(): string { return this.#m_shortcutKey; }

	/**
	 * Normalizes the sequence, updates the binding in the configured scope and emits `changed` when the normalized sequence changes.
	 * @param key Keyboard sequence to bind. Use an empty string to clear it.
	 */
	setShortcut(key: string): void {
		const normalized = CShortcut.normalizeSequence(key);
		if (normalized === this.#m_shortcutKey) return;
		this.#m_shortcutKey = normalized;
		this.#updateShortcut();
		this.changed.emit();
	}

	/**
	 * Looks up the widget that scopes the action's keyboard binding.
	 * @returns The scope widget, or `null` if there is no scope.
	 */
	shortcutParent(): CWidget | null { return this.#m_shortcutParent; }

	/**
	 * Recreates the binding under the supplied widget when a sequence is configured. The action has one shared scope across its presentations.
	 * @param parent Scope widget, or `null` to remove the active binding.
	 */
	setShortcutParent(parent: CWidget | null): void {
		if (parent === this.#m_shortcutParent) return;
		this.#m_shortcut?.destroy();
		this.#m_shortcut = null;
		this.#m_shortcutParent = parent;
		this.#updateShortcut();
		this.changed.emit();
	}

	/** Releases the keyboard binding. Menus and toolbars do not own actions. */
	destroy(): void {
		this.#m_shortcut?.destroy();
		this.#m_shortcut = null;
		this.#m_shortcutParent = null;
	}

	#updateShortcut(): void {
		if (this.#m_shortcutKey === "" || this.#m_shortcutParent === null) {
			this.#m_shortcut?.destroy();
			this.#m_shortcut = null;
			return;
		}
		if (this.#m_shortcut === null) {
			this.#m_shortcut = new CShortcut(this.#m_shortcutKey, this.#m_shortcutParent);
			this.#m_shortcut.activated.connect(() => this.trigger());
		} else {
			this.#m_shortcut.setKey(this.#m_shortcutKey);
		}
		this.#m_shortcut.setEnabled(this.#m_enabled);
	}

/**
 * Returns the action text.
 * @returns Current display text.
 */
	text(): string {
		return this.#m_text;
	}

/**
	 * Sets the text. May emit `changed`.
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
	 * Sets the icon. May emit `changed`.
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
		this.#m_shortcut?.setEnabled(enabled);
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
