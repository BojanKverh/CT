import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CMouseEvent, CMouseButton } from "../events/CMouseEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { COrientation } from "../gui/COrientation.js";
import { CPushButton } from "../widgets/CPushButton.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionScrollBar } from "../gui/CStyleOptionScrollBar.js";

/** Implements the scroll bar widget. */
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

	/** Signal emitted when value changes. */
	readonly valueChanged = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(orientation: COrientation, parent: CWidget | null = null) {
		/** Provides super behavior. */
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
		this.#m_backwardButton.setFocusPolicy(CFocusPolicy.ClickFocus);
		this.#m_forwardButton.setFocusPolicy(CFocusPolicy.ClickFocus);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /** Provides orientation behavior. */
    orientation() : COrientation {
        return this.#m_orientation;
    }

	/** Returns the minimum . */
	minimum(): number {
		return this.#m_minimum;
	}

	/** Returns the maximum . */
	maximum(): number {
		return this.#m_maximum;
	}

	/** Provides value behavior. */
	value(): number {
		return this.#m_value;
	}

	/** Provides single step behavior. */
	singleStep(): number {
		return this.#m_singleStep;
	}

	/** Provides page step behavior. */
	pageStep(): number {
		return this.#m_pageStep;
	}

	/** Sets the minimum. */
	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	/** Sets the maximum. */
	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	/** Sets the range. */
	setRange(minimum: number, maximum: number): void {
		/** Provides if behavior. */
		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;

		this.setValue(this.#m_value);
		this.update();
	}

	/** Sets the value. */
	setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		/** Provides if behavior. */
		if (clamped === this.#m_value)
			return;

		this.#m_value = clamped;

		this.valueChanged.emit(this.#m_value);
		this.update();
	}

	/** Sets the single step. */
	setSingleStep(step: number): void {
		this.#m_singleStep = Math.max(0, step);
	}

	/** Sets the page step. */
	setPageStep(step: number): void {
		this.#m_pageStep = Math.max(0, step);
	}

	/** Performs step backward. */
	stepBackward(): void {
		this.setValue(this.#m_value - this.#m_singleStep);
	}

	/** Performs step forward. */
	stepForward(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

	/** Provides page backward behavior. */
	pageBackward(): void {
		this.setValue(this.#m_value - this.#m_pageStep);
	}

	/** Provides page forward behavior. */
	pageForward(): void {
		this.setValue(this.#m_value + this.#m_pageStep);
	}

    /** Provides track start behavior. */
    trackStart(): number {
	    return this.buttonSize();
    }

    /** Provides button size behavior. */
    buttonSize(): number {
	    return this.#m_orientation === COrientation.Horizontal? this.height() : this.width();
    }

    /** Provides track length behavior. */
    trackLength(): number {
	    const totalLength = this.#m_orientation === COrientation.Horizontal? this.width() : this.height();
	    return Math.max(0, totalLength - 2 * this.buttonSize());
    }

    /** Provides thumb length behavior. */
    thumbLength(): number {
	    const range = this.#m_maximum - this.#m_minimum;
	    const pageStep = this.#m_pageStep;
	    const trackLength = this.trackLength();

	    const ratio = range + pageStep === 0 ? 1 : pageStep / (range + pageStep);

	    return Math.min(trackLength, Math.max(16, trackLength * ratio));
    }

    /** Provides thumb start behavior. */
    thumbStart(): number {
	    const range = this.#m_maximum - this.#m_minimum;
	    const travel = Math.max(0, this.trackLength() - this.thumbLength());
	    const ratio = range === 0? 0 : (this.#m_value - this.#m_minimum) / range;
	    return this.trackStart() + travel * ratio;
    }

    /** Sets the geometry. */
    override setGeometry(x: number, y: number, width: number, height: number) : void {
        super.setGeometry(x, y, width, height);
        const size = this.buttonSize();
        /** Provides if behavior. */
        if (this.#m_orientation === COrientation.Horizontal) {
            this.#m_backwardButton.setGeometry(1, 1, size - 2, this.height() - 2);
            this.#m_forwardButton.setGeometry(this.width() - size, 1, size - 2, this.height() - 2);
        } else {
            this.#m_backwardButton.setGeometry(1, 1, this.width() - 2, size - 2);
            this.#m_forwardButton.setGeometry(1, this.height() - size, this.width() - 2, size - 2);
        }
    }

    /** Handles the mouse press event. */
    protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

        const position = this.#eventPosition(event);
		/** Provides if behavior. */
		if (position < this.thumbStart()) {
			this.pageBackward();
			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (position > this.thumbStart() + this.thumbLength()) {
			this.pageForward();
			event.accept();
			return;
		}

		this.#m_dragging = true;
		this.#m_dragOffset = position - this.thumbStart();

		event.accept();
	}

	/** Handles the mouse move event. */
	protected override mouseMoveEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}
        const position = this.#eventPosition(event);
		this.#setValueFromThumbPosition(position - this.#m_dragOffset);
		event.accept();
	}

    /** Handles the mouse release event. */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton || !this.#m_dragging) {
			event.ignore();
			return;
		}
        const position = this.#eventPosition(event);
		this.#setValueFromThumbPosition(position - this.#m_dragOffset);
		this.#m_dragging = false;
		event.accept();
	}

    /** Handles the key press event. */
    protected override keyPressEvent(event: CKeyEvent): void {
	    /** Provides switch behavior. */
	    switch (event.key()) {
	    case "ArrowLeft":
            /** Provides if behavior. */
            if (this.#m_orientation === COrientation.Horizontal) {
		        this.stepBackward();
		        event.accept();
		        return;
            }
            break;

	    case "ArrowRight":
            /** Provides if behavior. */
            if (this.#m_orientation === COrientation.Horizontal) {
		        this.stepForward();
		        event.accept();
		        return;
            }
            break;

        case "ArrowUp":
	        /** Provides if behavior. */
	        if (this.#m_orientation === COrientation.Vertical) {
		        this.stepBackward();
		        event.accept();
		        return;
	        }
	        break;

        case "ArrowDown":
	        /** Provides if behavior. */
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

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(this);

		this.style().drawScrollBar(painter, option);
	}

    #setValueFromThumbPosition(position: number): void {
	    const travel = Math.max(0, this.trackLength() - this.thumbLength());
    	/** Provides if behavior. */
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