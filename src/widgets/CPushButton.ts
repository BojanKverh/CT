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

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;

		event.accept();
		this.update();
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
}