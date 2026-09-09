import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CWidget } from "./CWidget.js";
import { CFrameShape, CFrameShadow } from "../gui/CFrameStyle.js"
import { CStyleOptionFrame } from "../gui/CStyleOptionFrame.js";

export class CFrame extends CWidget {
	#m_frameShape = CFrameShape.NoFrame;
	#m_frameShadow = CFrameShadow.Plain;
	#m_lineWidth = 1;
	#m_midLineWidth = 0;

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	frameShape(): CFrameShape {
		return this.#m_frameShape;
	}

	setFrameShape(shape: CFrameShape): void {
		if (this.#m_frameShape === shape)
			return;

		this.#m_frameShape = shape;
		this.frameChanged();
		this.update();
	}

	frameShadow(): CFrameShadow {
		return this.#m_frameShadow;
	}

	setFrameShadow(shadow: CFrameShadow): void {
		if (this.#m_frameShadow === shadow)
			return;

		this.#m_frameShadow = shadow;
        this.frameChanged();
		this.update();
	}

	lineWidth(): number {
		return this.#m_lineWidth;
	}

	setLineWidth(width: number): void {
		width = Math.max(0, width);

		if (this.#m_lineWidth === width)
			return;

		this.#m_lineWidth = width;
		this.frameChanged();
		this.update();
	}

	midLineWidth(): number {
		return this.#m_midLineWidth;
	}

	setMidLineWidth(width: number): void {
		width = Math.max(0, width);

		if (this.#m_midLineWidth === width)
			return;

		this.#m_midLineWidth = width;
        this.frameChanged();
		this.update();
	}

	frameWidth(): number {
		if (this.#m_frameShape === CFrameShape.NoFrame)
			return 0;

		if (this.#m_frameShape === CFrameShape.Panel)
			return this.#m_lineWidth;

		if (this.#m_frameShadow === CFrameShadow.Plain)
			return this.#m_lineWidth;

		return 2 * this.#m_lineWidth + this.#m_midLineWidth;
	}

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

	protected frameChanged(): void
	{
	}
}