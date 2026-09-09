import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionSlider } from "../gui/CStyleOptionSlider.js";

export class CSlider extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
    #m_dragging = false;
    #m_singleStep = 1;
    #m_pageStep = 10;

    readonly valueChanged = new CSignal<[number]>();

    constructor(parent: CWidget | null = null) {
	    super(parent);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
    }

	minimum(): number {
		return this.#m_minimum;
	}

	maximum(): number {
		return this.#m_maximum;
	}

	value(): number {
		return this.#m_value;
	}

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

	setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			maximum = minimum;

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

    setMinimum(minimum: number): void {
	    this.setRange(minimum, this.#m_maximum);
    }

    setMaximum(maximum: number): void {
	    this.setRange(this.#m_minimum, maximum);
    }

    singleStep(): number {
	    return this.#m_singleStep;
    }

    setSingleStep(step: number): void {
	    this.#m_singleStep = Math.max(0, step);
    }

    pageStep(): number {
	    return this.#m_pageStep;
    }

    setPageStep(step: number): void {
	    this.#m_pageStep = Math.max(0, step);
    }

    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionSlider();
		option.initFromSlider(this);

		this.style().drawSlider(painter, option);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_dragging = true;
		this.setValue(this.#valueFromPosition(event.x()));

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.setValue(this.#valueFromPosition(event.x()));

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
		this.setValue(this.#valueFromPosition(event.x()));

		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
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