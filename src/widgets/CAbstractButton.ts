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

	/**
	 * Reads the button label.
	 * @returns The current label, which may be empty.
	 */
	text(): string {
		return this.#m_text;
	}

	/**
	 * Changes the label and requests repainting if the text differs.
	 * @param text New label text.
	 */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

	/**
	 * Checks whether the button supports a checked state.
	 * @returns `true` if checking is enabled.
	 */
	isCheckable(): boolean {
		return this.#m_checkable;
	}

	/**
	 * Enables or disables the checked state. Disabling a checked button clears the state and emits `toggled(false)`.
	 * @param checkable `true` to allow the button to be checked.
	 */
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

	/**
	 * Reads the button's current checked state.
	 * @returns `true` if the button is checked.
	 */
	isChecked(): boolean {
		return this.#m_checked;
	}

	/**
	 * Changes the state of a checkable button and emits `toggled` if the state changes.
	 * @param checked Requested checked state.
	 */
	setChecked(checked: boolean): void {
		/** Provides if behavior. */
		if (!this.#m_checkable || this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(this.#m_checked);
		this.update();
	}

	/** Inverts the checked state if the button is checkable. */
	toggle(): void {
		/** Provides if behavior. */
		if (!this.#m_checkable)
			return;

		this.setChecked(!this.#m_checked);
	}

	/**
	 * Stops any active repeat timer and configures the delays for future auto-repeat activation.
	 * @param delay Delay before the first repeat in milliseconds, clamped to zero or greater.
	 * @param interval Time between repeats in milliseconds, clamped to at least one.
	 */
	setAutoRepeat(delay: number, interval: number): void {
		this.resetAutoRepeat();
		this.#m_autoRepeatDelay = Math.max(0, delay);
		this.#m_autoRepeatInterval = Math.max(1, interval);
	}
	
	/** Stops the repeat timer and disables auto-repeat. */
	resetAutoRepeat(): void {
		this.#m_repeatTimer.stop();
		this.#m_autoRepeatDelay = -1;
		this.#m_autoRepeatInterval = -1;
	}
	
	/**
	 * Checks whether auto-repeat is configured.
	 * @returns `true` if the initial delay is nonnegative and the interval is positive.
	 */
	isAutoRepeat(): boolean {
		return this.#m_autoRepeatDelay >= 0 && this.#m_autoRepeatInterval > 0;
	}

	/** Starts the initial repeat timer if configured. Its first timeout emits `clicked` and switches the timer to the repeat interval. */
	protected startAutoRepeat(): void {
		/** Provides if behavior. */
		if (!this.isAutoRepeat()) {
			this.stopAutoRepeat();
			return;
		}

		this.#m_repeatTimer.setSingleShot(true);
		this.#m_repeatTimer.start(this.#m_autoRepeatDelay);
	}

	/** Stops the current repeat timer while retaining the delay and interval. */
	protected stopAutoRepeat(): void {
		this.#m_repeatTimer.stop();
	}
}
