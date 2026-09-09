import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionToolTipWidget } from "../gui/CStyleOptionToolTipWidget.js";

export class CToolTipWidget extends CWidget {
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

		return new CSize(metrics.textWidth(this.#m_text) + 2 * this.style().toolTipHorizontalPadding(),
			metrics.height() + 2 * this.style().toolTipVerticalPadding());
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(this);

		this.style().drawToolTip(painter, option);
	}
}