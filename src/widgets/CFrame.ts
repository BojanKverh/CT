import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CWidget } from "./CWidget.js";
import { CFrameShape, CFrameShadow } from "../gui/CFrameStyle.js"
import { CStyleOptionFrame } from "../gui/CStyleOptionFrame.js";

/** Implements the frame widget. */
export class CFrame extends CWidget {
	#m_frameShape = CFrameShape.NoFrame;
	#m_frameShadow = CFrameShadow.Plain;
	#m_lineWidth = 1;
	#m_midLineWidth = 0;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/** Provides frame shape behavior. */
	frameShape(): CFrameShape {
		return this.#m_frameShape;
	}

	/** Sets the frame shape. */
	setFrameShape(shape: CFrameShape): void {
		/** Provides if behavior. */
		if (this.#m_frameShape === shape)
			return;

		this.#m_frameShape = shape;
		this.frameChanged();
		this.update();
	}

	/** Provides frame shadow behavior. */
	frameShadow(): CFrameShadow {
		return this.#m_frameShadow;
	}

	/** Sets the frame shadow. */
	setFrameShadow(shadow: CFrameShadow): void {
		/** Provides if behavior. */
		if (this.#m_frameShadow === shadow)
			return;

		this.#m_frameShadow = shadow;
        this.frameChanged();
		this.update();
	}

	/** Provides line width behavior. */
	lineWidth(): number {
		return this.#m_lineWidth;
	}

	/** Sets the line width. */
	setLineWidth(width: number): void {
		width = Math.max(0, width);

		/** Provides if behavior. */
		if (this.#m_lineWidth === width)
			return;

		this.#m_lineWidth = width;
		this.frameChanged();
		this.update();
	}

	/** Provides mid line width behavior. */
	midLineWidth(): number {
		return this.#m_midLineWidth;
	}

	/** Sets the mid line width. */
	setMidLineWidth(width: number): void {
		width = Math.max(0, width);

		/** Provides if behavior. */
		if (this.#m_midLineWidth === width)
			return;

		this.#m_midLineWidth = width;
        this.frameChanged();
		this.update();
	}

	/** Provides frame width behavior. */
	frameWidth(): number {
		/** Provides if behavior. */
		if (this.#m_frameShape === CFrameShape.NoFrame)
			return 0;

		/** Provides if behavior. */
		if (this.#m_frameShape === CFrameShape.Panel)
			return this.#m_lineWidth;

		/** Provides if behavior. */
		if (this.#m_frameShadow === CFrameShadow.Plain)
			return this.#m_lineWidth;

		return 2 * this.#m_lineWidth + this.#m_midLineWidth;
	}

	/** Provides frame rect behavior. */
	frameRect(): CRect {
		return this.rect();
	}

	/** Returns the widget's contents rectangle. */
	override contentsRect(): CRect {
		const frameWidth = this.frameWidth();
		return new CRect(frameWidth, frameWidth, Math.max(0, this.width() - 2 * frameWidth),
			Math.max(0, this.height() - 2 * frameWidth)
		);
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		super.paintEvent(painter);

		/** Provides if behavior. */
		if (this.#m_frameShape === CFrameShape.NoFrame)
			return;

		const option = new CStyleOptionFrame();
		option.initFromFrame(this);

		this.style().drawFrame(painter, option);
	}

	/** Handles frame changed behavior. */
	protected frameChanged(): void
	{
	}
}