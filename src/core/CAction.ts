/** @module Core/CAction */
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
    * @group Signals
    */
    readonly changed = new CSignal<[]>();
    /**
    * Emitted when the action is triggered.
    * @group Signals
    */
    readonly triggered = new CSignal<[]>();
    /**
    * Emitted when the checked state changes.
    * @group Signals
    * @param checked New checked state.
    *
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

    /** Shortcut active in shortcutParent() and its descendants. */
    shortcut(): string { return this.#m_shortcutKey; }

    /**
    * Assigns a keyboard sequence and installs its shortcut in the configured widget scope.
    */
    setShortcut(key: string): void {
		const normalized = CShortcut.normalizeSequence(key);
		if (normalized === this.#m_shortcutKey) return;
		this.#m_shortcutKey = normalized;
		this.#updateShortcut();
		this.changed.emit();
	}

    /**
    * Returns the widget defining this action's shortcut scope, or null.
    */
    shortcutParent(): CWidget | null { return this.#m_shortcutParent; }

    /** Assigns one explicit scope shared by all presentations of this action. */
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
    * Assigned icon used by the control's drawing style.
    * The initial value is `null`.
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
		this.#m_shortcut?.setEnabled(enabled);
		this.changed.emit();
	}

    /**
    * Whether the option supports a persistent checked state.
    * The initial value is `false`.
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
    * Whether the option is checked.
    * The initial value is `false`.
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
