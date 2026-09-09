import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CStyleOptionGroupBox } from "../gui/CStyleOptionGroupBox.js";

export class CGroupBox extends CWidget {
	#m_title: string;

	constructor(title = "", parent: CWidget | null = null) {
		super(parent);

		this.#m_title = title;
	}

	title(): string {
		return this.#m_title;
	}

	setTitle(title: string): void {
		if (this.#m_title === title)
			return;

		this.#m_title = title;
		this.update();
	}

	override contentsRect(): CRect {
		const titleHeight = this.fontMetrics().height();
		const top = titleHeight;
		return new CRect(0, top, this.width(), Math.max(0, this.height() - top));
	}

    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(this);

		this.style().drawGroupBox(painter, option);
	}
}