import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSlider } from "../gui/CStyleOptionSlider.js";

/** Implements the slider widget. */
export class CSlider extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
    #m_dragging = false;
    #m_singleStep = 1;
    #m_pageStep = 10;

    /** Signal emitted when value changes. */
    readonly valueChanged = new CSignal<[number]>();

    /** Creates a new instance. */
    constructor(parent: CWidget | null = null) {
	    /** Provides super behavior. */
	    super(parent);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
    }

	/**
	 * Returns the minimum .
	 * @returns The minimum.
	 */
	minimum(): number {
		return this.#m_minimum;
	}

	/**
	 * Returns the maximum .
	 * @returns The maximum.
	 */
	maximum(): number {
		return this.#m_maximum;
	}

	/**
	 * Reads the value.
	 * @returns The value.
	 */
	value(): number {
		return this.#m_value;
	}

	/**
	 * Sets the value.
	 * @param value New value.
	 */
	setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		/** Provides if behavior. */
		if (this.#m_value === clamped)
			return;

		this.#m_value = clamped;
		this.valueChanged.emit(this.#m_value);
		this.update();
	}

	/**
	 * Sets the range.
	 * @param minimum Minimum.
	 * @param maximum Maximum.
	 */
	setRange(minimum: number, maximum: number): void {
		/** Provides if behavior. */
		if (minimum > maximum)
			maximum = minimum;

		/** Provides if behavior. */
		if (
			this.#m_minimum === minimum &&
			this.#m_maximum === maximum
		)
			return;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;

		this.setValue(this.#m_value);
		this.update();
	}

    /**
     * Sets the minimum.
     * @param minimum Minimum.
     */
    setMinimum(minimum: number): void {
	    this.setRange(minimum, this.#m_maximum);
    }

    /**
     * Sets the maximum.
     * @param maximum Maximum.
     */
    setMaximum(maximum: number): void {
	    this.setRange(this.#m_minimum, maximum);
    }

    /**
     * Reads the single step.
     * @returns The single step.
     */
    singleStep(): number {
	    return this.#m_singleStep;
    }

    /**
     * Sets the single step.
     * @param step Step.
     */
    setSingleStep(step: number): void {
	    this.#m_singleStep = Math.max(0, step);
    }

    /**
     * Reads the page step.
     * @returns The page step.
     */
    pageStep(): number {
	    return this.#m_pageStep;
    }

    /**
     * Sets the page step.
     * @param step Step.
     */
    setPageStep(step: number): void {
	    this.#m_pageStep = Math.max(0, step);
    }

    /**
     * Draws the slider through the supplied painter.
     * @param painter Painter for the current drawing operation.
     */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSlider();
		option.initFromSlider(this);

		this.style().drawSlider(painter, option);
	}

	/**
	 * Responds to a pointer button press for the slider. May update the dragging. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_dragging = true;
		this.setValue(this.#valueFromPosition(event.x()));

		event.accept();
	}

	/**
	 * Responds to pointer movement for the slider. May accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.setValue(this.#valueFromPosition(event.x()));

		event.accept();
	}

	/**
	 * Responds to a pointer button release for the slider. May update the dragging. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (
			event.button() !== CMouseButton.LeftButton
			|| !this.#m_dragging
		) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;
		this.setValue(this.#valueFromPosition(event.x()));

		event.accept();
	}

	/**
	 * Responds to a key press for the slider. May accept or ignore the event depending on the input.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides switch behavior. */
		switch (event.key()) {
		case "ArrowLeft":
        case "ArrowUp":
			this.setValue(this.#m_value -  this.#m_singleStep);
			event.accept();
			return;

		case "ArrowRight":
        case "ArrowDown":
			this.setValue(this.#m_value +  this.#m_singleStep);
			event.accept();
			return;

        case "PageUp":
		    this.setValue(this.#m_value - this.#m_pageStep);
		    event.accept();
		    return;

	    case "PageDown":
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

	#valueFromPosition(x: number): number {
		const handleSize = this.style().sliderHandleSize();
		const start = handleSize / 2;
		const length = Math.max(0, this.width() - handleSize);

		/** Provides if behavior. */
		if (length === 0)
			return this.#m_minimum;

		const position = Math.max(
			0,
			Math.min(x - start, length)
		);

		const ratio = position / length;

		return Math.round(
			this.#m_minimum
			+ ratio * (this.#m_maximum - this.#m_minimum)
		);
	}
}