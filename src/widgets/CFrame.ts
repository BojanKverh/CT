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

	/**
	 * Reads the frame shape.
	 * @returns The frame shape.
	 */
	frameShape(): CFrameShape {
		return this.#m_frameShape;
	}

	/**
	 * Sets the frame shape.
	 * @param shape Shape.
	 */
	setFrameShape(shape: CFrameShape): void {
		/** Provides if behavior. */
		if (this.#m_frameShape === shape)
			return;

		this.#m_frameShape = shape;
		this.frameChanged();
		this.update();
	}

	/**
	 * Reads the frame shadow.
	 * @returns The frame shadow.
	 */
	frameShadow(): CFrameShadow {
		return this.#m_frameShadow;
	}

	/**
	 * Sets the frame shadow.
	 * @param shadow Shadow.
	 */
	setFrameShadow(shadow: CFrameShadow): void {
		/** Provides if behavior. */
		if (this.#m_frameShadow === shadow)
			return;

		this.#m_frameShadow = shadow;
        this.frameChanged();
		this.update();
	}

	/**
	 * Reads the line width.
	 * @returns The line width.
	 */
	lineWidth(): number {
		return this.#m_lineWidth;
	}

	/**
	 * Sets the line width.
	 * @param width Width.
	 */
	setLineWidth(width: number): void {
		width = Math.max(0, width);

		/** Provides if behavior. */
		if (this.#m_lineWidth === width)
			return;

		this.#m_lineWidth = width;
		this.frameChanged();
		this.update();
	}

	/**
	 * Reads the mid line width.
	 * @returns The mid line width.
	 */
	midLineWidth(): number {
		return this.#m_midLineWidth;
	}

	/**
	 * Sets the mid line width.
	 * @param width Width.
	 */
	setMidLineWidth(width: number): void {
		width = Math.max(0, width);

		/** Provides if behavior. */
		if (this.#m_midLineWidth === width)
			return;

		this.#m_midLineWidth = width;
        this.frameChanged();
		this.update();
	}

	/**
	 * Reads the frame width of the frame.
	 * @returns The frame width.
	 */
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

	/**
	 * Reads the frame rect of the frame.
	 * @returns The frame rect.
	 */
	frameRect(): CRect {
		return this.rect();
	}

	/**
	 * Returns the widget's contents rectangle.
	 * @returns A new `CRect`.
	 */
	override contentsRect(): CRect {
		const frameWidth = this.frameWidth();
		return new CRect(frameWidth, frameWidth, Math.max(0, this.width() - 2 * frameWidth),
			Math.max(0, this.height() - 2 * frameWidth)
		);
	}

	/**
	 * Draws the frame through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		super.paintEvent(painter);

		/** Provides if behavior. */
		if (this.#m_frameShape === CFrameShape.NoFrame)
			return;

		const option = new CStyleOptionFrame();
		option.initFromFrame(this);

		this.style().drawFrame(painter, option);
	}

	/**
	 * Provides the subclass hook for frame changed. This implementation does nothing.
	 */
	protected frameChanged(): void
	{
	}
}