import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseEvent, CMouseButton } from "../events/CMouseEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { COrientation } from "../gui/COrientation.js";
import { CPushButton } from "../widgets/CPushButton.js";

export class CScrollBar extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
	#m_singleStep = 1;
	#m_pageStep = 10;
    #m_dragging = false;
    #m_dragOffset = 0;
    #m_orientation : COrientation;
    #m_backwardButton = new CPushButton(this);
    #m_forwardButton = new CPushButton(this);

	readonly valueChanged = new CSignal<[number]>();

	constructor(orientation: COrientation, parent: CWidget | null = null) {
		super(parent);
        this.#m_orientation = orientation;

        this.#m_backwardButton.setText(this.#m_orientation === COrientation.Horizontal? "◀" : "▲");
        this.#m_forwardButton.setText(this.#m_orientation === COrientation.Horizontal? "▶" : "▼");
        this.#m_backwardButton.setAutoRepeat(400, 60);
        this.#m_forwardButton.setAutoRepeat(400, 60);

        this.#m_backwardButton.clicked.connect(() => {
            this.stepBackward();
        });
        this.#m_forwardButton.clicked.connect(() => {
            this.stepForward();
        });
	}

    orientation() : COrientation {
        return this.#m_orientation;
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

	singleStep(): number {
		return this.#m_singleStep;
	}

	pageStep(): number {
		return this.#m_pageStep;
	}

	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;

		this.setValue(this.#m_value);
		this.update();
	}

	setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		if (clamped === this.#m_value)
			return;

		this.#m_value = clamped;

		this.valueChanged.emit(this.#m_value);
		this.update();
	}

	setSingleStep(step: number): void {
		this.#m_singleStep = Math.max(0, step);
	}

	setPageStep(step: number): void {
		this.#m_pageStep = Math.max(0, step);
	}

	stepBackward(): void {
		this.setValue(this.#m_value - this.#m_singleStep);
	}

	stepForward(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

	pageBackward(): void {
		this.setValue(this.#m_value - this.#m_pageStep);
	}

	pageForward(): void {
		this.setValue(this.#m_value + this.#m_pageStep);
	}

    trackStart(): number {
	    return this.buttonSize();
    }

    buttonSize(): number {
	    return this.#m_orientation === COrientation.Horizontal? this.height() : this.width();
    }

    trackLength(): number {
	    const totalLength = this.#m_orientation === COrientation.Horizontal? this.width() : this.height();
	    return Math.max(0, totalLength - 2 * this.buttonSize());
    }

    thumbLength(): number {
	    const range = this.#m_maximum - this.#m_minimum;
	    const pageStep = this.#m_pageStep;
	    const trackLength = this.trackLength();

	    const ratio = range + pageStep === 0 ? 1 : pageStep / (range + pageStep);

	    return Math.min(trackLength, Math.max(16, trackLength * ratio));
    }

    thumbStart(): number {
	    const range = this.#m_maximum - this.#m_minimum;
	    const travel = Math.max(0, this.trackLength() - this.thumbLength());
	    const ratio = range === 0? 0 : (this.#m_value - this.#m_minimum) / range;
	    return this.trackStart() + travel * ratio;
    }

    override setGeometry(x: number, y: number, width: number, height: number) : void {
        super.setGeometry(x, y, width, height);
        const size = this.buttonSize();
        if (this.#m_orientation === COrientation.Horizontal) {
            this.#m_backwardButton.setGeometry(1, 1, size - 2, this.height() - 2);
            this.#m_forwardButton.setGeometry(this.width() - size, 1, size - 2, this.height() - 2);
        } else {
            this.#m_backwardButton.setGeometry(1, 1, this.width() - 2, size - 2);
            this.#m_forwardButton.setGeometry(1, this.height() - size, this.width() - 2, size - 2);
        }
    }

    protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        const position = this.#eventPosition(event);
		if (position < this.thumbStart()) {
			this.pageBackward();
			event.accept();
			return;
		}

		if (position > this.thumbStart() + this.thumbLength()) {
			this.pageForward();
			event.accept();
			return;
		}

		this.#m_dragging = true;
		this.#m_dragOffset = position - this.thumbStart();

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}
        const position = this.#eventPosition(event);
		this.#setValueFromThumbPosition(position - this.#m_dragOffset);
		event.accept();
	}

    protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton || !this.#m_dragging) {
			event.ignore();
			return;
		}
        const position = this.#eventPosition(event);
		this.#setValueFromThumbPosition(position - this.#m_dragOffset);
		this.#m_dragging = false;
		event.accept();
	}

    protected override keyPressEvent(event: CKeyEvent): void {
	    switch (event.key()) {
	    case "ArrowLeft":
            if (this.#m_orientation === COrientation.Horizontal) {
		        this.stepBackward();
		        event.accept();
		        return;
            }
            break;

	    case "ArrowRight":
            if (this.#m_orientation === COrientation.Horizontal) {
		        this.stepForward();
		        event.accept();
		        return;
            }
            break;

        case "ArrowUp":
	        if (this.#m_orientation === COrientation.Vertical) {
		        this.stepBackward();
		        event.accept();
		        return;
	        }
	        break;

        case "ArrowDown":
	        if (this.#m_orientation === COrientation.Vertical) {
		        this.stepForward();
		        event.accept();
		        return;
	        }
	        break;

	    case "PageUp":
		    this.pageBackward();
		    event.accept();
		    return;

	    case "PageDown":
		    this.pageForward();
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

	    super.keyPressEvent(event);
    }

    protected override paintEvent(painter: CPainter): void {
		this.style().drawScrollBar(painter, this);
	}

    #setValueFromThumbPosition(position: number): void {
	    const travel = Math.max(0, this.trackLength() - this.thumbLength());
    	if (travel === 0) {
	    	this.setValue(this.#m_minimum);
		    return;
	    }

	    const thumbStart = Math.max(this.trackStart(), Math.min(position, this.trackStart() + travel));
	    const ratio = (thumbStart - this.trackStart()) / travel;
	    const value = this.#m_minimum + ratio * (this.#m_maximum - this.#m_minimum);
	    this.setValue(Math.round(value));
    }

    #eventPosition(event: CMouseEvent): number {
	    return this.#m_orientation === COrientation.Horizontal? event.x() : event.y();
    }
}