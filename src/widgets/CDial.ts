/** @module Widgets/CDial */
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSlider } from "../gui/CStyleOptionSlider.js";

/** Rotary numeric input constrained by a range and step. */
export class CDial extends CWidget {
    /** Starting angle used by rotary-control geometry. */
    static readonly StartAngle = 135;
    /** Angular span mapped to the dial's configured value range. */
    static readonly SpanAngle = 270;

	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
	#m_dragging = false;
	#m_singleStep = 1;
	#m_pageStep = 10;

    /**
    * Emitted with the new numeric value after clamping and validation.
    * @group Signals
    */
    readonly valueChanged = new CSignal<[number]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Lower permitted value.
    * The initial value is `0`.
    */
    minimum(): number {
		return this.#m_minimum;
	}

    /**
    * Upper permitted value.
    * The initial value is `100`.
    */
    maximum(): number {
		return this.#m_maximum;
	}

    /**
    * Current numeric value.
    * The initial value is `0`.
    */
    value(): number {
		return this.#m_value;
	}

    /**
    * Clamps the requested value to the inclusive range and emits valueChanged only when the stored value changes.
    */
    setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		if (this.#m_value === clamped)
			return;

		this.#m_value = clamped;
		this.valueChanged.emit(this.#m_value);
		this.update();
	}

    /**
    * Sets the inclusive numeric bounds and re-clamps the current value. If minimum exceeds maximum, maximum becomes minimum.
    */
    setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			maximum = minimum;

		if (
			this.#m_minimum === minimum
			&& this.#m_maximum === maximum
		)
			return;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;

		this.setValue(this.#m_value);
		this.update();
	}

    /**
    * Updates the lower range bound and adjusts the current value through setRange().
    */
    setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

    /**
    * Updates the upper range bound and adjusts the current value through setRange().
    */
    setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

    /**
    * Increment used for a single keyboard or step-button action.
    * The initial value is `1`.
    */
    singleStep(): number {
		return this.#m_singleStep;
	}

    /**
    * Sets the increment for a single step, clamping negative steps to zero.
    */
    setSingleStep(step: number): void {
		this.#m_singleStep = Math.max(0, step);
	}

    /**
    * Increment represented by one page operation.
    * The initial value is `10`.
    */
    pageStep(): number {
		return this.#m_pageStep;
	}

    /**
    * Sets the page increment, clamping negative steps to zero.
    */
    setPageStep(step: number): void {
		this.#m_pageStep = Math.max(0, step);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSlider();
		option.initFrom(this);
		option.minimum = this.#m_minimum;
		option.maximum = this.#m_maximum;
		option.value = this.#m_value;

		this.style().drawDial(painter, option);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_dragging = true;
		this.setValue(this.#valueFromPosition(event.x(), event.y()));
		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.setValue(this.#valueFromPosition(event.x(), event.y()));
		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (
			event.button() !== CMouseButton.LeftButton
			|| !this.#m_dragging
		) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;
		this.setValue(this.#valueFromPosition(event.x(), event.y()));
		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		switch (event.key()) {
		case "ArrowLeft":
		case "ArrowDown":
			this.setValue(this.#m_value - this.#m_singleStep);
			event.accept();
			return;

		case "ArrowRight":
		case "ArrowUp":
			this.setValue(this.#m_value + this.#m_singleStep);
			event.accept();
			return;

		case "PageDown":
			this.setValue(this.#m_value - this.#m_pageStep);
			event.accept();
			return;

		case "PageUp":
			this.setValue(this.#m_value + this.#m_pageStep);
			event.accept();
			return;

		case "Home":
			this.setValue(this.#m_minimum);
			event.accept();
			return;

		case "End":
			this.setValue(this.#m_maximum);
			event.accept();
			return;
		}

		event.ignore();
	}

	#valueFromPosition(x: number, y: number): number {
		if (this.#m_maximum === this.#m_minimum)
			return this.#m_minimum;

		const dx = x - this.width() / 2;
		const dy = y - this.height() / 2;

		if (dx === 0 && dy === 0)
			return this.#m_value;

		let angle = Math.atan2(dy, dx) * 180 / Math.PI;
		if (angle < 0)
			angle += 360;

		let dialAngle: number;
		const endAngle = (CDial.StartAngle + CDial.SpanAngle) % 360;

		if (angle >= CDial.StartAngle) {
			dialAngle = angle;
		} else if (angle <= endAngle) {
			dialAngle = angle + 360;
		} else {
			// Dead zone at the bottom: clamp to the nearest endpoint.
			dialAngle = angle < 90
				? CDial.StartAngle + CDial.SpanAngle
				: CDial.StartAngle;
		}

		const ratio = Math.max(
			0,
			Math.min(
				1,
				(dialAngle - CDial.StartAngle) / CDial.SpanAngle
			)
		);

		return Math.round(
			this.#m_minimum
			+ ratio * (this.#m_maximum - this.#m_minimum)
		);
	}
}
