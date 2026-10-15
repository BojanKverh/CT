import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CPoint } from "../geometry/CPoint.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CSize } from "../geometry/CSize.js";
import { CStyleOptionPushButton } from "../gui/CStyleOptionPushButton.js";

/** Implements the push button widget. */
export class CPushButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_radius = 3;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.setCheckable(false);
	}

	/** Returns whether the down condition is active. */
	isDown(): boolean {
		return this.#m_down;
	}

	/** Returns whether the hovered condition is active. */
	isHovered(): boolean {
		return this.#m_hovered;
	}

	radius(): number {
		return this.#m_radius;
	}

	setRadius(r: number) {
		this.#m_radius = r;
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		const fm = new CFontMetrics(this.font());
		return new CSize(Math.max(80, fm.textWidth(this.text()) + 24), 30);
	}

	/** Handles the mouse press event. */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();
		
		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	/** Handles the mouse release event. */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		const inside = this.rect().contains(new CPoint(event.x(), event.y()));

		event.accept();
		this.update();
		
		/** Provides if behavior. */
		if (wasDown && inside)
			this.clicked.emit();

		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionPushButton();
		option.initFromPushButton(this);

		this.style().drawPushButton(painter, option);
	}

	/** Handles the mouse enter event. */
	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	/** Handles the mouse leave event. */
	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	/** Handles the key press event. */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		/** Provides if behavior. */
		if (event.key() === "Enter") {
			event.accept();
			this.clicked.emit();
			return;
		}

		event.ignore();
	}

	/** Handles the key release event. */
	protected override keyReleaseEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		/** Provides if behavior. */
		if (wasDown)
			this.clicked.emit();
	}
}
