/** @module Widgets/CSplitterHandle */
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
/** Focusable splitter handle supporting mouse dragging and axis-specific arrow-key movement. */
export class CSplitterHandle extends CWidget
{
	#m_orientation: COrientation;
	#m_splitter: CSplitter;
	#m_index: number;
	#m_pressed = false;
	#m_pressOffset = 0;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param orientation Axis used for layout and interaction.
    * @param splitter Input used to configure CSplitterHandle.
    * @param index Input used to configure CSplitterHandle.
    */
    constructor(orientation: COrientation, splitter: CSplitter, index: number) {
		super(splitter);

		this.#m_orientation = orientation;
		this.#m_splitter = splitter;
		this.#m_index = index;

        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Axis along which dragging this handle resizes neighboring panes.
    */
    orientation(): COrientation
	{
		return this.#m_orientation;
	}

    /**
    * Changes the axis used for handle painting, cursor feedback and dragging.
    */
    setOrientation(orientation: COrientation): void
	{
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
		this.update();
	}

    /**
    * Owning splitter whose neighboring panes this handle resizes.
    */
    splitter(): CSplitter
	{
		return this.#m_splitter;
	}

    /**
    * Zero-based handle position within the owning splitter.
    */
    index(): number
	{
		return this.#m_index;
	}

	override sizeHint(): CSize
	{
		const size = this.#m_splitter.handleWidth();

		if (this.#m_orientation === COrientation.Horizontal)
			return new CSize(size, 0);

		return new CSize(0, size);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(this);

		this.style().drawSplitterHandle(painter, option);
	}

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

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        this.#m_pressOffset = (this.#m_orientation === COrientation.Horizontal)? 
            event.x() : event.y();

		this.#m_pressed = true;
		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
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

	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		if (!this.#m_pressed) {
			event.ignore();
			return;
		}

		this.#m_pressed = false;
		event.accept();
	}

    protected override mouseEnterEvent(event: CMouseEvent): void {

    }

    protected override mouseLeaveEvent(event: CMouseEvent): void {

    }
}