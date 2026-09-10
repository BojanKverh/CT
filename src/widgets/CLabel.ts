import { CFrame } from "./CFrame.js";
import { CPainter } from "../painting/CPainter.js";
import { CAlignment } from "../core/CAlignment.js";
import { CPixmap } from "../painting/CPixmap.js";
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionLabel } from "../gui/CStyleOptionLabel.js";

/** Implements the label widget. */
export class CLabel extends CFrame {
	#m_text = "";
	#m_alignment = CAlignment.Left | CAlignment.VCenter;
	#m_pixmap: CPixmap | null = null;

	static readonly #HPADDING: number = 6;
	static readonly #VPADDING: number = 3;


	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
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
		this.update();
	}

	/** Provides alignment behavior. */
	alignment(): CAlignment {
		return this.#m_alignment;
	}

	/** Sets the alignment. */
	setAlignment(alignment: CAlignment): void {
		/** Provides if behavior. */
		if (this.#m_alignment === alignment)
			return;

		this.#m_alignment = alignment;
		this.update();
	}

	/** Provides pixmap behavior. */
	pixmap(): CPixmap | null {
		return this.#m_pixmap;
	}

	/** Sets the pixmap. */
	setPixmap(pixmap: CPixmap | null): void {
		/** Provides if behavior. */
		if (this.#m_pixmap === pixmap)
			return;
		this.#m_pixmap = pixmap;
		this.update();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(
			this.fontMetrics().textWidth(this.text()) + 2 * CLabel.#HPADDING,
			this.fontMetrics().height() + 2 * CLabel.#VPADDING
		);
	}

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionLabel();
		option.initFromLabel(this);

		this.style().drawLabel(painter, option);
	}
}