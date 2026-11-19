/** @module Widgets/CSizeGrip */
import { CApplication } from "../core/CApplication.js";
import { CWidget } from "./CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSizeGrip } from "../gui/CStyleOptionSizeGrip.js";

/** Drag handle that resizes its target widget within configured constraints. */
export class CSizeGrip extends CWidget
{
	#m_pressed = false;
	#m_pressX = 0;
	#m_pressY = 0;
	#m_pressWidth = 0;
	#m_pressHeight = 0;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.setCursor(CCursorShape.SizeFDiag);
        const sz = this.sizeHint();
        this.setFixedSize(sz.width(), sz.height());
        this.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

    /** Hiding or disabling a grip terminates any active pointer resize. */
    override setVisible(visible: boolean): void {
        if (!visible) this.#cancelResize();
        super.setVisible(visible);
    }

    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancelResize();
        super.setEnabled(enabled);
    }

    #cancelResize(): void {
        this.#m_pressed = false;
        if (CApplication.exists() && CApplication.instance().mouseGrabber() === this)
            CApplication.instance().releaseMouse();
    }

	override sizeHint(): CSize
	{
		return new CSize(16, 16);
	}

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const parent = this.parent();

		if (!parent) {
			event.ignore();
			return;
		}

		const pos = this.mapToCanvas(event.pos().x(), event.pos().y());

		this.#m_pressed = true;
		this.#m_pressX = pos.x();
		this.#m_pressY = pos.y();
		this.#m_pressWidth = parent.width();
		this.#m_pressHeight = parent.height();

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		if (!this.#m_pressed) {
			event.ignore();
			return;
		}

		const parent = this.parent();

		if (!parent) {
			event.ignore();
			return;
		}

		const pos = this.mapToCanvas(event.pos().x(), event.pos().y());

		let width = this.#m_pressWidth + pos.x() - this.#m_pressX;
		let height = this.#m_pressHeight + pos.y() - this.#m_pressY;

		width = Math.max(
			parent.minimumWidth(),
			Math.min(width, parent.maximumWidth())
		);

		height = Math.max(
			parent.minimumHeight(),
			Math.min(height, parent.maximumHeight())
		);

		parent.resize(width, height);
        this.move(parent.width() - this.width(), parent.height() - this.height());

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_pressed = false;

		event.accept();
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSizeGrip();
		option.initFromSizeGrip(this);

		this.style().drawSizeGrip(painter, option);
	}
}