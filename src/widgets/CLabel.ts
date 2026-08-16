import { CWidget } from "./CWidget.js";
import { CPainter } from "../painting/CPainter.js";
import { CAlignment } from "../core/CAlignment.js";
import { CRect } from "../geometry/CRect.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

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
	    this.style().drawLabel(painter, this);
    }
}