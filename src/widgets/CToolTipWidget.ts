import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";

export class CToolTipWidget extends CWidget {
	static readonly HorizontalPadding = 6;
	static readonly VerticalPadding = 3;

	#m_text = "";

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

		const hint = this.sizeHint();
		this.resize(hint.width(), hint.height());

		this.update();
	}

    override sizeHint(): CSize {
		const metrics = new CFontMetrics(this.font());

		return new CSize(metrics.textWidth(this.#m_text) + 2 * CToolTipWidget.HorizontalPadding,
			metrics.height() + 2 * CToolTipWidget.VerticalPadding);
	}

	protected override paintEvent(painter: CPainter): void {
		this.style().drawToolTip(painter, this);
	}
}