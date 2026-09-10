import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CTimer } from "../core/CTimer.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

/** Abstract base class for abstract button widgets. */
export abstract class CAbstractButton extends CWidget {
	#m_text = "";
	#m_checkable = false;
	#m_checked = false;

	#m_autoRepeatDelay = -1;
	#m_autoRepeatInterval = -1;

	#m_repeatTimer = new CTimer(this);

	/** Public clicked member. */
	readonly clicked = new CSignal<[]>();
	/** Public toggled member. */
	readonly toggled = new CSignal<[boolean]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_repeatTimer.timeout.connect(() => {
			this.clicked.emit();
			/** Provides if behavior. */
			if (this.#m_repeatTimer.isSingleShot()) {
				this.#m_repeatTimer.setSingleShot(false);
				this.#m_repeatTimer.start(this.#m_autoRepeatInterval);
			}
		});

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

	/** Returns whether the checkable condition is active. */
	isCheckable(): boolean {
		return this.#m_checkable;
	}

	/** Sets the checkable. */
	setCheckable(checkable: boolean): void {
		/** Provides if behavior. */
		if (this.#m_checkable === checkable)
			return;

		this.#m_checkable = checkable;

		/** Provides if behavior. */
		if (!checkable && this.#m_checked) {
			this.#m_checked = false;
			this.toggled.emit(false);
		}

		this.update();
	}

	/** Returns whether the checked condition is active. */
	isChecked(): boolean {
		return this.#m_checked;
	}

	/** Sets the checked. */
	setChecked(checked: boolean): void {
		/** Provides if behavior. */
		if (!this.#m_checkable || this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(this.#m_checked);
		this.update();
	}

	/** Toggles the current state. */
	toggle(): void {
		/** Provides if behavior. */
		if (!this.#m_checkable)
			return;

		this.setChecked(!this.#m_checked);
	}

	/** Sets the auto repeat. */
	setAutoRepeat(delay: number, interval: number): void {
		this.resetAutoRepeat();
		this.#m_autoRepeatDelay = Math.max(0, delay);
		this.#m_autoRepeatInterval = Math.max(1, interval);
	}
	
	/** Provides reset auto repeat behavior. */
	resetAutoRepeat(): void {
		this.#m_repeatTimer.stop();
		this.#m_autoRepeatDelay = -1;
		this.#m_autoRepeatInterval = -1;
	}
	
	/** Returns whether the auto repeat condition is active. */
	isAutoRepeat(): boolean {
		return this.#m_autoRepeatDelay >= 0 && this.#m_autoRepeatInterval > 0;
	}

	/** Handles start auto repeat behavior. */
	protected startAutoRepeat(): void {
		/** Provides if behavior. */
		if (!this.isAutoRepeat()) {
			this.stopAutoRepeat();
			return;
		}

		this.#m_repeatTimer.setSingleShot(true);
		this.#m_repeatTimer.start(this.#m_autoRepeatDelay);
	}

	/** Handles stop auto repeat behavior. */
	protected stopAutoRepeat(): void {
		this.#m_repeatTimer.stop();
	}
}
