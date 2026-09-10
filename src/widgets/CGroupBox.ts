import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CStyleOptionGroupBox } from "../gui/CStyleOptionGroupBox.js";

/** Implements the group box widget. */
export class CGroupBox extends CWidget {
	#m_title: string;

	/** Creates a new instance. */
	constructor(title = "", parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_title = title;
	}

	/** Provides title behavior. */
	title(): string {
		return this.#m_title;
	}

	/** Sets the title. */
	setTitle(title: string): void {
		/** Provides if behavior. */
		if (this.#m_title === title)
			return;

		this.#m_title = title;
		this.update();
	}

	/** Returns the widget's contents rectangle. */
	override contentsRect(): CRect {
		const titleHeight = this.fontMetrics().height();
		const top = titleHeight;
		return new CRect(0, top, this.width(), Math.max(0, this.height() - top));
	}

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(this);

		this.style().drawGroupBox(painter, option);
	}
}