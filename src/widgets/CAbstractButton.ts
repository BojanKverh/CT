/** @module Widgets/CAbstractButton */
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CTimer } from "../core/CTimer.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

/** Shared caption, check state, activation signals and repeat timers for button controls. */
export abstract class CAbstractButton extends CWidget {
	#m_text = "";
	#m_checkable = false;
	#m_checked = false;

	#m_autoRepeatDelay = -1;
	#m_autoRepeatInterval = -1;

	#m_repeatTimer = new CTimer(this);

    /**
    * Emitted when the concrete button activates, including configured auto-repeat ticks. Connect application actions here.
    * @group Signals
    */
    readonly clicked = new CSignal<[]>();
    /**
    * Emitted with the new checked value when setChecked(), toggle() or disabling checkability changes the state.
    * @group Signals
    */
    readonly toggled = new CSignal<[boolean]>();

    /**
    * Creates a keyboard-focusable button with empty text and checkable state disabled.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_repeatTimer.timeout.connect(() => {
			this.clicked.emit();
			if (this.#m_repeatTimer.isSingleShot()) {
				this.#m_repeatTimer.setSingleShot(false);
				this.#m_repeatTimer.start(this.#m_autoRepeatInterval);
			}
		});

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Stored caption or text value.
    * The initial value is `""`.
    */
    text(): string {
		return this.#m_text;
	}

    /**
    * Changes the caption and schedules repaint. Reapplying the same text has no effect.
    */
    setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

    /**
    * Reports whether checked-state changes are enabled. Defaults to false.
    */
    isCheckable(): boolean {
		return this.#m_checkable;
	}

    /**
    * Enables checked state. Setting false clears a checked button and emits toggled(false).
    */
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

    /**
    * Whether the option is checked.
    * The initial value is `false`.
    */
    isChecked(): boolean {
		return this.#m_checked;
	}

    /**
    * Changes checked state and emits toggled when checkable. Ignored when checkability is disabled or the value is unchanged.
    */
    setChecked(checked: boolean): void {
		if (!this.#m_checkable || this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.toggled.emit(this.#m_checked);
		this.update();
	}

    /**
    * Inverts checked state when checkable and emits toggled through setChecked().
    */
    toggle(): void {
		if (!this.#m_checkable)
			return;

		this.setChecked(!this.#m_checked);
	}

    /**
    * Configures repeat delay and interval in milliseconds. Delay is clamped to at least zero and interval to at least one. Stops any previous repeat.
    */
    setAutoRepeat(delay: number, interval: number): void {
		this.resetAutoRepeat();
		this.#m_autoRepeatDelay = Math.max(0, delay);
		this.#m_autoRepeatInterval = Math.max(1, interval);
	}

    /**
    * Stops repeat delivery and clears the delay and interval so later presses do not repeat.
    */
    resetAutoRepeat(): void {
		this.#m_repeatTimer.stop();
		this.#m_autoRepeatDelay = -1;
		this.#m_autoRepeatInterval = -1;
	}

    /**
    * Returns whether a non-negative delay and positive interval have been configured.
    */
    isAutoRepeat(): boolean {
		return this.#m_autoRepeatDelay >= 0 && this.#m_autoRepeatInterval > 0;
	}

    /**
    * Starts the initial repeat delay for a press. Concrete buttons must pair this with stopAutoRepeat() on release.
    */
    protected startAutoRepeat(): void {
		if (!this.isAutoRepeat()) {
			this.stopAutoRepeat();
			return;
		}

		this.#m_repeatTimer.setSingleShot(true);
		this.#m_repeatTimer.start(this.#m_autoRepeatDelay);
	}

    /**
    * Stops the active repeat timer while retaining its configured delay and interval.
    */
    protected stopAutoRepeat(): void {
		this.#m_repeatTimer.stop();
	}
}
