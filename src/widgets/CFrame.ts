/** @module Widgets/CFrame */
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CWidget } from "./CWidget.js";
import { CFrameShape, CFrameShadow } from "../gui/CFrameStyle.js"
import { CStyleOptionFrame } from "../gui/CStyleOptionFrame.js";

/** Widget with configurable frame shape, shadow and content inset. */
export class CFrame extends CWidget {
	#m_frameShape = CFrameShape.NoFrame;
	#m_frameShadow = CFrameShadow.Plain;
	#m_lineWidth = 1;
	#m_midLineWidth = 0;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
	}

    /**
    * Geometric shape used by the frame style.
    * The initial value is `CFrameShape.NoFrame`.
    */
    frameShape(): CFrameShape {
		return this.#m_frameShape;
	}

    /**
    * Changes frame geometry and notifies the container to recompute content insets.
    */
    setFrameShape(shape: CFrameShape): void {
		if (this.#m_frameShape === shape)
			return;

		this.#m_frameShape = shape;
		this.frameChanged();
		this.update();
	}

    /**
    * Raised, sunken or plain frame presentation.
    * The initial value is `CFrameShadow.Plain`.
    */
    frameShadow(): CFrameShadow {
		return this.#m_frameShadow;
	}

    /**
    * Changes raised, sunken or plain framing.
    */
    setFrameShadow(shadow: CFrameShadow): void {
		if (this.#m_frameShadow === shadow)
			return;

		this.#m_frameShadow = shadow;
        this.frameChanged();
		this.update();
	}

    /**
    * Logical width used for the frame's main line.
    * The initial value is `1`.
    */
    lineWidth(): number {
		return this.#m_lineWidth;
	}

    /**
    * Changes the logical width of the principal frame outline.
    */
    setLineWidth(width: number): void {
		width = Math.max(0, width);

		if (this.#m_lineWidth === width)
			return;

		this.#m_lineWidth = width;
		this.frameChanged();
		this.update();
	}

    /**
    * Logical width used for the frame's middle line.
    * The initial value is `0`.
    */
    midLineWidth(): number {
		return this.#m_midLineWidth;
	}

    /**
    * Changes the logical width of the secondary frame line.
    */
    setMidLineWidth(width: number): void {
		width = Math.max(0, width);

		if (this.#m_midLineWidth === width)
			return;

		this.#m_midLineWidth = width;
        this.frameChanged();
		this.update();
	}

    /**
    * Returns the content inset calculated from the frame's shape and line settings.
    */
    frameWidth(): number {
		if (this.#m_frameShape === CFrameShape.NoFrame)
			return 0;

		if (this.#m_frameShape === CFrameShape.Panel)
			return this.#m_lineWidth;

		if (this.#m_frameShadow === CFrameShadow.Plain)
			return this.#m_lineWidth;

		return 2 * this.#m_lineWidth + this.#m_midLineWidth;
	}

    /**
    * Returns the rectangle used for drawing this widget's frame.
    */
    frameRect(): CRect {
		return this.rect();
	}

	override contentsRect(): CRect {
		const frameWidth = this.frameWidth();
		return new CRect(frameWidth, frameWidth, Math.max(0, this.width() - 2 * frameWidth),
			Math.max(0, this.height() - 2 * frameWidth)
		);
	}

	protected override paintEvent(painter: CPainter): void {
		super.paintEvent(painter);

		if (this.#m_frameShape === CFrameShape.NoFrame)
			return;

		const option = new CStyleOptionFrame();
		option.initFromFrame(this);

		this.style().drawFrame(painter, option);
	}

    /**
    * Override to recompute container geometry after frame settings change.
    */
    protected frameChanged(): void
	{
	}
}