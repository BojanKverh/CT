/** @module Widgets/CToolTipWidget */
import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionToolTipWidget } from "../gui/CStyleOptionToolTipWidget.js";

/** Transient text popup managed by the application's hover tooltip timer. */
export class CToolTipWidget extends CWidget {
	#m_text = "";

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
	}

    /**
    * Stored caption or text value.
    * The initial value is `""`.
    */
    text(): string {
		return this.#m_text;
	}

    /**
    * Changes hover-help content and updates the popup's preferred size.
    */
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