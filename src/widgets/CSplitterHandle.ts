import { CWidget } from "./CWidget.js";
import { CSize } from "../geometry/CSize.js";
import { COrientation } from "../gui/COrientation.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CSplitter } from "./CSplitter.js";
import type { CPainter } from "../painting/CPainter.js";
import { CCursorShape } from "../gui/CCursorShape.js";

export class CSplitterHandle extends CWidget
{
	#m_orientation: COrientation;
	#m_splitter: CSplitter;
	#m_index: number;
	#m_pressed = false;
	#m_pressOffset = 0;

	constructor(
		orientation: COrientation,
		splitter: CSplitter,
		index: number
	) {
		super(splitter);

		this.#m_orientation = orientation;
		this.#m_splitter = splitter;
		this.#m_index = index;

        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
	}

	orientation(): COrientation
	{
		return this.#m_orientation;
	}

	setOrientation(orientation: COrientation): void
	{
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
        this.setCursor(orientation === COrientation.Horizontal? CCursorShape.SplitH
			: CCursorShape.SplitV);
		this.update();
	}

	splitter(): CSplitter
	{
		return this.#m_splitter;
	}

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

	protected override paintEvent(painter: CPainter): void
	{
		this.style().drawSplitterHandle(painter, this);
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