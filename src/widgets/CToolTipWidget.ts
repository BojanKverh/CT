import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionToolTipWidget } from "../gui/CStyleOptionToolTipWidget.js";

/** Implements the tool tip widget widget. */
export class CToolTipWidget extends CWidget {
	#m_text = "";

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/** Provides text behavior. */
	text(): string {
		return this.#m_text;
	}

	/** Sets the text. */
	setText(text: string): void {
		/** Provides if behavior. */
		if (this.#m_text === text)
			return;

		this.#m_text = text;

		const hint = this.sizeHint();
		this.resize(hint.width(), hint.height());

		this.update();
	}

    /** Returns the preferred size of the widget. */
    override sizeHint(): CSize {
		const metrics = new CFontMetrics(this.font());

		return new CSize(metrics.textWidth(this.#m_text) + 2 * this.style().toolTipHorizontalPadding(),
			metrics.height() + 2 * this.style().toolTipVerticalPadding());
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(this);

		this.style().drawToolTip(painter, option);
	}
}