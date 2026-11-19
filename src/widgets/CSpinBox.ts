/** @module Widgets/CSpinBox */
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CLineEdit } from "../widgets/CLineEdit.js";
import { CPushButton } from "./CPushButton.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../events/CWheelEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CIntValidator } from "../util/CIntValidator.js";

/**
 * Integer spin editor with configurable bounds, stepping, text validation and a valueChanged signal.
 */
export class CSpinBox extends CWidget {
    #m_editor = new CLineEdit(this);
	#m_upButton = new CPushButton(this);
	#m_downButton = new CPushButton(this);

	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
	#m_singleStep = 1;
	#m_validator = new CIntValidator(this.#m_minimum, this.#m_maximum);

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

		this.#m_editor.setValidator(this.#m_validator);

        this.#m_upButton.clicked.connect(() => {
			this.stepUp();
		});

		this.#m_downButton.clicked.connect(() => {
			this.stepDown();
		});

		this.#m_editor.editingFinished.connect(() => {
			this.#commitEditorValue();
		});

		this.#m_editor.setText(String(this.#m_value));
        this.#m_upButton.setText("▲");
		this.#m_upButton.setRadius(0);
        this.#m_downButton.setText("▼");
		this.#m_downButton.setRadius(0);
		this.#m_upButton.setAutoRepeat(400, 60);
		this.#m_downButton.setAutoRepeat(400, 60);
		this.#m_editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.setFocusProxy(this.#m_editor);
		this.#m_upButton.setFocusPolicy(CFocusPolicy.ClickFocus);
		this.#m_downButton.setFocusPolicy(CFocusPolicy.ClickFocus);
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
    * Increment used for a single keyboard or step-button action.
    * The initial value is `1`.
    */
    singleStep(): number {
		return this.#m_singleStep;
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
    * Sets the inclusive numeric bounds and re-clamps the current value. If minimum exceeds maximum, maximum becomes minimum.
    */
    setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;
		this.#m_validator.setRange(minimum, maximum);

		this.setValue(this.#m_value);
		this.update();
	}

    /**
    * Clamps the requested value to the inclusive range and emits valueChanged only when the stored value changes.
    */
    setValue(value: number): void {
	    const clamped = Math.max(this.#m_minimum, Math.min(value, this.#m_maximum));
	    if (clamped === this.#m_value)
		    return;

	    this.#m_value = clamped;
	    this.#m_editor.setText(String(this.#m_value));
	    this.valueChanged.emit(this.#m_value);
	    this.update();
    }

    /**
    * Sets the increment for a single step, clamping negative steps to zero.
    */
    setSingleStep(step: number): void {
		this.#m_singleStep = Math.max(0, step);
	}

    /** Performs step up. */
    stepUp(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

    /** Performs step down. */
    stepDown(): void {
		this.setValue(this.#m_value - this.#m_singleStep);
	}

    /**
    * Embedded text input used by this composite.
    * The initial value is `new CLineEdit(this)`.
    */
    lineEdit(): CLineEdit {
		return this.#m_editor;
	}

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#updateChildGeometry();
    }

	override sizeHint(): CSize {
		return new CSize(16 + this.fontMetrics().textWidth(this.#m_maximum.toString()), 
			Math.max(36, 6 + this.fontMetrics().height()));
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		switch (event.key()) {
		case "ArrowUp":
			this.stepUp();
			event.accept();
			return;

		case "ArrowDown":
			this.stepDown();
			event.accept();
			return;

		case "Enter":
			this.#commitEditorValue();
			event.accept();
			return;
		}
		super.keyPressEvent(event);
	}

	protected override wheelEvent(event: CWheelEvent): void {
		if (event.deltaY() < 0)
			this.stepUp();
		else if (event.deltaY() > 0)
			this.stepDown();
		else {
			event.ignore();
			return;
		}
		event.accept();
	}

	#updateChildGeometry(): void {
	    const buttonWidth = 20;
	    const halfHeight = this.height() / 2;
	    this.#m_editor.setGeometry(0, 0, this.width() - buttonWidth, this.height());
	    this.#m_upButton.setGeometry(this.width() - buttonWidth, 0, 
            buttonWidth - 1, halfHeight);
	    this.#m_downButton.setGeometry(this.width() - buttonWidth, halfHeight, 
            buttonWidth - 1, this.height() - halfHeight);
    }

	#commitEditorValue(): void {
		const text = this.#m_editor.text().trim();
		const parsed = Number.parseInt(text, 10);
		if (Number.isNaN(parsed)) {
			this.#m_editor.setText(String(this.#m_value));
			return;
		}
		const clamped = Math.max(this.#m_minimum, Math.min(parsed, this.#m_maximum)
		);
		this.setValue(clamped);
		this.#m_editor.setText(String(this.#m_value));
	}
}
