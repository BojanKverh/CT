import { CWidget } from "./CWidget";
import { CPainter } from "../painting/CPainter";
import { CAlignment } from "../core/CAlignment";
import { CRect } from "../geometry/CRect";

export class CLabel extends CWidget {
	#m_text = "";
	#m_alignment = CAlignment.Left | CAlignment.VCenter;

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
	}

	alignment(): CAlignment {
		return this.#m_alignment;
	}

	setAlignment(alignment: CAlignment): void {
		if (this.#m_alignment === alignment)
			return;

		this.#m_alignment = alignment;
		this.update();
	}

	protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle("white");
        painter.fillRect(new CRect(0, 0, this.width(), this.height()));
		painter.setFillStyle("black");
		painter.setFont(this.font());

		let x: number;
		let y: number;

		if (this.#m_alignment & CAlignment.Right) {
			painter.setTextAlign("right");
			x = this.width();
		} else if (this.#m_alignment & CAlignment.HCenter) {
			painter.setTextAlign("center");
			x = this.width() / 2;
		} else {
			painter.setTextAlign("left");
			x = 0;
		}

		if (this.#m_alignment & CAlignment.Bottom) {
			painter.setTextBaseline("bottom");
			y = this.height();
		} else if (this.#m_alignment & CAlignment.VCenter) {
			painter.setTextBaseline("middle");
			y = this.height() / 2;
		} else {
			painter.setTextBaseline("top");
			y = 0;
		}

		painter.drawText(this.#m_text, x, y);
	}

}