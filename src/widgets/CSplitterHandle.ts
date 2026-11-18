import { CWidget } from "./CWidget.js";
import { CSize } from "../geometry/CSize.js";
import { COrientation } from "../gui/COrientation.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CSplitter } from "./CSplitter.js";
import type { CPainter } from "../painting/CPainter.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSplitterHandle } from "../gui/CStyleOptionSplitterHandle.js";
/** Implements the splitter handle widget. */
export class CSplitterHandle extends CWidget
{
	#m_orientation: COrientation;
	#m_splitter: CSplitter;
	#m_index: number;
	#m_pressed = false;
	#m_pressOffset = 0;

	/** Creates a new instance. */
	constructor(orientation: COrientation, splitter: CSplitter, index: number) {
		/** Provides super behavior. */
		super(splitter);

		this.#m_orientation = orientation;
		this.#m_splitter = splitter;
		this.#m_index = index;

        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/**
	 * Reads the orientation.
	 * @returns The orientation.
	 */
	orientation(): COrientation
	{
		return this.#m_orientation;
	}

	/**
	 * Sets the orientation.
	 * @param orientation Horizontal or vertical orientation.
	 */
	setOrientation(orientation: COrientation): void
	{
		/** Provides if behavior. */
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
		this.update();
	}

	/**
	 * Reads the splitter.
	 * @returns The splitter.
	 */
	splitter(): CSplitter
	{
		return this.#m_splitter;
	}

	/**
	 * Reads the index.
	 * @returns The index.
	 */
	index(): number
	{
		return this.#m_index;
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns The size hint.
	 */
	override sizeHint(): CSize
	{
		const size = this.#m_splitter.handleWidth();

		/** Provides if behavior. */
		if (this.#m_orientation === COrientation.Horizontal)
			return new CSize(size, 0);

		return new CSize(0, size);
	}

	/**
	 * Draws the splitter handle through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(this);

		this.style().drawSplitterHandle(painter, option);
	}

    /**
     * Responds to a key press for the splitter handle. May accept or ignore the event depending on the input.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        const horizontal = this.#m_orientation === COrientation.Horizontal;
        const backward = horizontal ? "ArrowLeft" : "ArrowUp";
        const forward = horizontal ? "ArrowRight" : "ArrowDown";
        if (event.key() !== backward && event.key() !== forward) {
            event.ignore();
            return;
        }

        const position = horizontal ? this.x() : this.y();
        const step = event.key() === backward ? -10 : 10;
        this.#m_splitter.moveSplitter(position + step, this.#m_index);
        event.accept();
    }

	/**
	 * Responds to a pointer button press for the splitter handle. May update the press offset, the pressed. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        this.#m_pressOffset = (this.#m_orientation === COrientation.Horizontal)? 
            event.x() : event.y();

		this.#m_pressed = true;
		event.accept();
	}

	/**
	 * Responds to pointer movement for the splitter handle. May accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (!this.#m_pressed) {
			event.ignore();
			return;
		}

		const pos = this.mapToCanvas(event.x(), event.y());
		const splitterPos = this.#m_splitter.mapFromCanvas(
			pos.x(), pos.y()
		);

		const value =
			(this.#m_orientation === COrientation.Horizontal
				? splitterPos.x()
				: splitterPos.y())
			- this.#m_pressOffset;

		this.#m_splitter.moveSplitter(value, this.#m_index);
		event.accept();
	}

	/**
	 * Responds to a pointer button release for the splitter handle. May update the pressed. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (!this.#m_pressed) {
			event.ignore();
			return;
		}

		this.#m_pressed = false;
		event.accept();
	}

    /**
     * Responds to pointer entry for the splitter handle.
     * @param event Event for pointer entry. This implementation ignores the argument.
     */
    protected override mouseEnterEvent(event: CMouseEvent): void {
        
    }

    /**
     * Responds to pointer exit for the splitter handle.
     * @param event Event for pointer exit. This implementation ignores the argument.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void {
        
    }
}