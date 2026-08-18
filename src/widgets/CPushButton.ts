import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CPoint } from "../geometry/CPoint.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CKeyEvent } from "../events/CKeyEvent.js";

export class CPushButton extends CWidget {
	readonly clicked = new CSignal();

	#m_down = false;
    #m_text = "";
    #m_hovered = false;

	#m_autoRepeatDelay = -1;
	#m_autoRepeatInterval = -1;

	#m_repeatTimeout: ReturnType<typeof setTimeout> | null = null;
	#m_repeatIntervalTimer: ReturnType<typeof setInterval> | null = null;

	isDown(): boolean {
		return this.#m_down;
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

    isHovered(): boolean {
		return this.#m_hovered;
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
		return (this.#m_autoRepeatDelay >= 0 && this.#m_autoRepeatInterval > 0);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;

		event.accept();
		this.update();
		
		if (this.isAutoRepeat())
			this.#startAutoRepeat();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		const inside = this.rect().contains(
			new CPoint(event.x(), event.y())
		);

		event.accept();
		this.update();

		if (wasDown && inside)
			this.clicked.emit();

		if (this.isAutoRepeat())
			this.#stopAutoRepeat();
	}

	protected override paintEvent(painter: CPainter): void {
	    this.style().drawPushButton(painter, this);
    }

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		if (event.key() === "Enter") {
			event.accept();
			this.clicked.emit();
			return;
		}

		event.ignore();
	}

	protected override keyReleaseEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		if (wasDown)
			this.clicked.emit();
	}

	#startAutoRepeat(): void {
		if (!this.isAutoRepeat())
			return;

		this.#m_repeatTimeout = setTimeout(() => {
			this.clicked.emit();

			this.#m_repeatIntervalTimer = setInterval(() => {
				this.clicked.emit();
			}, this.#m_autoRepeatInterval);
		}, this.#m_autoRepeatDelay);
	}

	#stopAutoRepeat() : void {
		if (this.#m_repeatIntervalTimer !== null)
			clearInterval(this.#m_repeatIntervalTimer);
		if (this.#m_repeatTimeout !== null)
			clearTimeout(this.#m_repeatTimeout);
	}
}