import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CPoint } from "../geometry/CPoint";

export class CPushButton extends CWidget {
	readonly clicked = new CSignal();

	#m_down = false;
    #m_text = "";

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
		painter.setFillStyle(this.#m_down ? "#808080" : "#c0c0c0");
		painter.fillRect(this.rect());

        painter.setFillStyle("black");
		painter.setFont("14px sans-serif");
		painter.setTextAlign("center");
		painter.setTextBaseline("middle");

		painter.drawText(this.#m_text, this.width() / 2, this.height() / 2);
	}
}