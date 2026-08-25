import { CFrame } from "./CFrame.js";
import { CPainter } from "../painting/CPainter.js";
import { CAlignment } from "../core/CAlignment.js";
import { CRect } from "../geometry/CRect.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CPixmap } from "../painting/CPixmap.js";

export class CLabel extends CFrame {
	#m_text = "";
	#m_alignment = CAlignment.Left | CAlignment.VCenter;
	#m_pixmap: CPixmap | null = null;

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

	pixmap(): CPixmap | null {
		return this.#m_pixmap;
	}

	setPixmap(pixmap: CPixmap | null): void {
		if (this.#m_pixmap === pixmap)
			return;
		this.#m_pixmap = pixmap;
		this.update();
	}

    protected override paintEvent(painter: CPainter): void {
	    this.style().drawLabel(painter, this);
    }
}