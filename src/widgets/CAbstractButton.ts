import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";

export abstract class CAbstractButton extends CWidget {
	#m_text = "";
	#m_checkable = false;
	#m_checked = false;

	#m_autoRepeatDelay = -1;
	#m_autoRepeatInterval = -1;

	#m_repeatTimeout: ReturnType<typeof setTimeout> | null = null;
	#m_repeatIntervalTimer: ReturnType<typeof setInterval> | null = null;

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

	setAutoRepeat(delay: number, interval: number): void {
		this.resetAutoRepeat();
		this.#m_autoRepeatDelay = Math.max(0, delay);
		this.#m_autoRepeatInterval = Math.max(1, interval);
	}
	
	resetAutoRepeat(): void {
		if (this.#m_repeatTimeout !== null) {
			clearTimeout(this.#m_repeatTimeout);
			this.#m_repeatTimeout = null;
		}
		if (this.#m_repeatIntervalTimer !== null) {
			clearInterval(this.#m_repeatIntervalTimer);
			this.#m_repeatIntervalTimer = null;
		}
		this.#m_autoRepeatDelay = -1;
		this.#m_autoRepeatInterval = -1;
	}
	
	isAutoRepeat(): boolean {
		return this.#m_autoRepeatDelay >= 0 && this.#m_autoRepeatInterval > 0;
	}

	protected startAutoRepeat(): void {
		if (!this.isAutoRepeat())
			return;

		this.#m_repeatTimeout = setTimeout(() => {
			this.clicked.emit();
			this.#m_repeatIntervalTimer = setInterval(() => {
				this.clicked.emit();
			}, this.#m_autoRepeatInterval);
		}, this.#m_autoRepeatDelay);
	}

	protected stopAutoRepeat(): void {
		if (this.#m_repeatIntervalTimer !== null) {
			clearInterval(this.#m_repeatIntervalTimer);
			this.#m_repeatIntervalTimer = null;
		}
		if (this.#m_repeatTimeout !== null) {
			clearTimeout(this.#m_repeatTimeout);
			this.#m_repeatTimeout = null;
		}
	}
}
