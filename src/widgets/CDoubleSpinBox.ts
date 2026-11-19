/** @module Widgets/CDoubleSpinBox */
import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../events/CWheelEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CDoubleValidator } from "../util/CDoubleValidator.js";
import { CLineEdit } from "./CLineEdit.js";
import { CPushButton } from "./CPushButton.js";
import { CWidget } from "./CWidget.js";

/** Floating-point editor with step buttons, precision and range constraints. */
export class CDoubleSpinBox extends CWidget {
	#m_editor = new CLineEdit(this);
	#m_upButton = new CPushButton(this);
	#m_downButton = new CPushButton(this);

	#m_minimum = 0;
	#m_maximum = 99.99;
	#m_value = 0;
	#m_singleStep = 1;
	#m_decimals = 2;
	#m_validator = new CDoubleValidator(
		this.#m_minimum,
		this.#m_maximum,
		this.#m_decimals
	);

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

		this.#m_upButton.clicked.connect(() => this.stepUp());
		this.#m_downButton.clicked.connect(() => this.stepDown());
		this.#m_editor.editingFinished.connect(() => {
			this.#commitEditorValue();
		});

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
		this.#updateEditorText();
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
    * The initial value is `99.99`.
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
    * Number of decimal places used to format the numeric value.
    * The initial value is `2`.
    */
    decimals(): number {
		return this.#m_decimals;
	}

    /**
    * Updates the lower numeric bound through setRange(), retaining the current maximum.
    */
    setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

    /**
    * Updates the upper numeric bound through setRange(), retaining the current minimum.
    */
    setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

    /**
    * Accepts finite inclusive bounds, rounds them to configured precision and re-clamps the current value. If minimum exceeds maximum, maximum becomes minimum.
    */
    setRange(minimum: number, maximum: number): void {
		if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
			return;

		minimum = this.#round(minimum);
		maximum = this.#round(maximum);

		if (minimum > maximum)
			maximum = minimum;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;
		this.#updateValidator();
		this.setValue(this.#m_value);
		this.#updateEditorText();
		this.update();
	}

    /**
    * Accepts a finite value, rounds and clamps it, synchronizes editor text and emits valueChanged when the stored value changes.
    */
    setValue(value: number): void {
		if (!Number.isFinite(value))
			return;

		const rounded = this.#round(value);
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(rounded, this.#m_maximum)
		);

		if (Object.is(clamped, this.#m_value)) {
			this.#updateEditorText();
			return;
		}

		this.#m_value = clamped;
		this.#updateEditorText();
		this.valueChanged.emit(this.#m_value);
		this.update();
	}

    /**
    * Configures the finite non-negative increment used by the step buttons.
    */
    setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, step);
	}

    /**
    * Changes decimal precision and updates value bounds, validation and formatted editor text.
    */
    setDecimals(decimals: number): void {
		if (!Number.isFinite(decimals))
			return;

		const normalized = Math.max(0, Math.min(100, Math.trunc(decimals)));
		if (normalized === this.#m_decimals)
			return;

		this.#m_decimals = normalized;
		this.#m_minimum = this.#round(this.#m_minimum);
		this.#m_maximum = this.#round(this.#m_maximum);
		if (this.#m_minimum > this.#m_maximum)
			this.#m_maximum = this.#m_minimum;
		this.#updateValidator();

		const oldValue = this.#m_value;
		this.#m_value = Math.max(
			this.#m_minimum,
			Math.min(this.#round(this.#m_value), this.#m_maximum)
		);
		this.#updateEditorText();

		if (!Object.is(oldValue, this.#m_value))
			this.valueChanged.emit(this.#m_value);

		this.update();
	}

    /**
    * Adds one configured single step through the bounded value setter.
    */
    stepUp(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

    /**
    * Subtracts one configured single step through the bounded value setter.
    */
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
		const minimumText = this.#format(this.#m_minimum);
		const maximumText = this.#format(this.#m_maximum);
		const textWidth = Math.max(
			this.fontMetrics().textWidth(minimumText),
			this.fontMetrics().textWidth(maximumText)
		);

		return new CSize(
			16 + textWidth,
			Math.max(36, 6 + this.fontMetrics().height())
		);
	}

    /** Handles keyboard stepping and commits edited text. */
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

    /** Handles mouse-wheel stepping. */
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
		this.#m_upButton.setGeometry(this.width() - buttonWidth, 0, buttonWidth - 1, halfHeight);
		this.#m_downButton.setGeometry(this.width() - buttonWidth, halfHeight, buttonWidth - 1, this.height() - halfHeight);
	}

	#commitEditorValue(): void {
		const parsed = Number.parseFloat(this.#m_editor.text().trim());
		if (!Number.isFinite(parsed)) {
			this.#updateEditorText();
			return;
		}

		this.setValue(parsed);
		this.#updateEditorText();
	}

	#updateEditorText(): void {
		this.#m_editor.setText(this.#format(this.#m_value));
	}

	#updateValidator(): void {
		this.#m_validator = new CDoubleValidator(
			this.#m_minimum,
			this.#m_maximum,
			this.#m_decimals
		);
		this.#m_editor.setValidator(this.#m_validator);
	}

	#format(value: number): string {
		return value.toFixed(this.#m_decimals);
	}

	#round(value: number): number {
		const rounded = Number(value.toFixed(this.#m_decimals));
		return Object.is(rounded, -0) ? 0 : rounded;
	}
}
