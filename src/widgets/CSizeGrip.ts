import { CApplication } from "../core/CApplication.js";
import { CWidget } from "./CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSizeGrip } from "../gui/CStyleOptionSizeGrip.js";

/** Implements the size grip widget. */
export class CSizeGrip extends CWidget
{
	#m_pressed = false;
	#m_pressX = 0;
	#m_pressY = 0;
	#m_pressWidth = 0;
	#m_pressHeight = 0;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		this.setCursor(CCursorShape.SizeFDiag);
        const sz = this.sizeHint();
        this.setFixedSize(sz.width(), sz.height());
        this.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

    /**
     * Hiding or disabling a grip terminates any active pointer resize.
     * @param visible Whether to show the target.
     */
    override setVisible(visible: boolean): void {
        if (!visible) this.#cancelResize();
        super.setVisible(visible);
    }

    /**
     * Sets the enabled.
     * @param enabled Whether to enable the feature.
     */
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancelResize();
        super.setEnabled(enabled);
    }

    #cancelResize(): void {
        this.#m_pressed = false;
        if (CApplication.exists() && CApplication.instance().mouseGrabber() === this)
            CApplication.instance().releaseMouse();
    }

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize
	{
		return new CSize(16, 16);
	}

	/**
	 * Responds to a pointer button press for the size grip. May update the pressed, the press x, the press y, the press width. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const parent = this.parent();

		/** Provides if behavior. */
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

	/**
	 * Responds to pointer movement for the size grip. May accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (!this.#m_pressed) {
			event.ignore();
			return;
		}

		const parent = this.parent();

		/** Provides if behavior. */
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

	/**
	 * Responds to a pointer button release for the size grip. May update the pressed. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_pressed = false;

		event.accept();
	}

	/**
	 * Draws the size grip through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSizeGrip();
		option.initFromSizeGrip(this);

		this.style().drawSizeGrip(painter, option);
	}
}