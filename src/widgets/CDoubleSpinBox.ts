import { CSignal } from "../core/CSignal.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../events/CWheelEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CDoubleValidator } from "../util/CDoubleValidator.js";
import { CLineEdit } from "./CLineEdit.js";
import { CPushButton } from "./CPushButton.js";
import { CWidget } from "./CWidget.js";

/** Implements a spin box for floating-point values. */
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

	/** Signal emitted when the value changes. */
	readonly valueChanged = new CSignal<[number]>();

	/** Creates a new instance. */
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

	/** Returns the minimum value. */
	minimum(): number {
		return this.#m_minimum;
	}

	/** Returns the maximum value. */
	maximum(): number {
		return this.#m_maximum;
	}

	/** Returns the current value. */
	value(): number {
		return this.#m_value;
	}

	/** Returns the step used by the buttons, arrow keys and mouse wheel. */
	singleStep(): number {
		return this.#m_singleStep;
	}

	/** Returns the number of digits shown after the decimal point. */
	decimals(): number {
		return this.#m_decimals;
	}

	/** Sets the minimum value. */
	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	/** Sets the maximum value. */
	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	/** Sets the permitted value range. */
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

	/** Sets the current value. */
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

	/** Sets the step used by the buttons, arrow keys and mouse wheel. */
	setSingleStep(step: number): void {
		if (Number.isFinite(step))
			this.#m_singleStep = Math.max(0, step);
	}

	/** Sets the number of digits shown after the decimal point. */
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

	/** Increases the current value by one step. */
	stepUp(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

	/** Decreases the current value by one step. */
	stepDown(): void {
		this.setValue(this.#m_value - this.#m_singleStep);
	}

	/** Returns the embedded line editor. */
	lineEdit(): CLineEdit {
		return this.#m_editor;
	}

	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number): void {
		super.setGeometry(x, y, width, height);
		this.#updateChildGeometry();
	}

	/** Returns the preferred size of the widget. */
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
