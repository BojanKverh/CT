import { CFrame } from "./CFrame.js";
import { CPainter } from "../painting/CPainter.js";
import { CAlignment } from "../core/CAlignment.js";
import { CPixmap } from "../painting/CPixmap.js";
import { CSize } from "../geometry/CSize.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CWidget } from "./CWidget.js";

export class CLabel extends CFrame {
	#m_text = "";
	#m_alignment = CAlignment.Left | CAlignment.VCenter;
	#m_pixmap: CPixmap | null = null;

	static readonly #HPADDING: number = 6;
	static readonly #VPADDING: number = 3;


	constructor(parent: CWidget | null = null)
	{
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

	override sizeHint(): CSize {
		return new CSize(
			this.fontMetrics().textWidth(this.text()) + 2 * CLabel.#HPADDING,
			this.fontMetrics().height() + 2 * CLabel.#VPADDING
		);
	}

    protected override paintEvent(painter: CPainter): void {
	    this.style().drawLabel(painter, this);
    }
}