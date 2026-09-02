import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CPoint } from "../geometry/CPoint.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CSize } from "../geometry/CSize.js";

export class CPushButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;

	constructor(parent: CWidget | null = null) {
		super(parent);
		this.setCheckable(false);
	}

	isDown(): boolean {
		return this.#m_down;
	}

	isHovered(): boolean {
		return this.#m_hovered;
	}

	override sizeHint(): CSize {
		const fm = new CFontMetrics(this.font());
		return new CSize(Math.max(80, fm.textWidth(this.text()) + 24), 30);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();

		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		const inside = this.rect().contains(new CPoint(event.x(), event.y()));

		event.accept();
		this.update();

		if (wasDown && inside)
			this.clicked.emit();

		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	protected override paintEvent(painter: CPainter): void {
		this.style().drawPushButton(painter, this);
	}

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		if (event.key() === "Enter") {
			event.accept();
			this.clicked.emit();
			return;
		}

		event.ignore();
	}

	protected override keyReleaseEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		if (wasDown)
			this.clicked.emit();
	}
}
