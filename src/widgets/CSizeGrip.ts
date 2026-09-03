import { CWidget } from "./CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CEventType } from "../events/CEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import type { CPainter } from "../painting/CPainter.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

export class CSizeGrip extends CWidget
{
	#m_pressed = false;
	#m_pressX = 0;
	#m_pressY = 0;
	#m_pressWidth = 0;
	#m_pressHeight = 0;

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.setCursor(CCursorShape.SizeFDiag);
        const sz = this.sizeHint();
        this.setFixedSize(sz.width(), sz.height());
        this.setFocusPolicy(CFocusPolicy.ClickFocus);
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

	protected override paintEvent(painter: CPainter): void
	{
		this.style().drawSizeGrip(painter, this);
	}
}