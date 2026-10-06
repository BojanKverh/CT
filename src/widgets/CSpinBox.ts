import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CLineEdit } from "../widgets/CLineEdit.js";
import { CPushButton } from "./CPushButton.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../../src/events/CWheelEvent.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CIntValidator } from "../util/CIntValidator.js";

/** Implements the spin box widget. */
export class CSpinBox extends CWidget {
    #m_editor = new CLineEdit(this);
	#m_upButton = new CPushButton(this);
	#m_downButton = new CPushButton(this);

	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
	#m_singleStep = 1;
	#m_validator = new CIntValidator(this.#m_minimum, this.#m_maximum);

	/** Signal emitted when value changes. */
	readonly valueChanged = new CSignal<[number]>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
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
        this.#m_downButton.setText("▼");
		this.#m_upButton.setAutoRepeat(400, 60);
		this.#m_downButton.setAutoRepeat(400, 60);
		this.#m_editor.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.#m_upButton.setFocusPolicy(CFocusPolicy.ClickFocus);
		this.#m_downButton.setFocusPolicy(CFocusPolicy.ClickFocus);
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
		this.#m_validator.setRange(minimum, maximum);

		this.setValue(this.#m_value);
		this.update();
	}

   /** Sets the value. */
   setValue(value: number): void {
	    const clamped = Math.max(this.#m_minimum, Math.min(value, this.#m_maximum));
	    /** Provides if behavior. */
	    if (clamped === this.#m_value)
		    return;

	    this.#m_value = clamped;
	    this.#m_editor.setText(String(this.#m_value));
	    this.valueChanged.emit(this.#m_value);
	    this.update();
    }

	/** Sets the single step. */
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

	/** Provides line edit behavior. */
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
		return new CSize(16 + this.fontMetrics().textWidth(this.#m_maximum.toString()), 
			Math.max(36, 6 + this.fontMetrics().height()));
	}

	/** Handles the key press event. */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides switch behavior. */
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

	/** Handles the wheel event. */
	protected override wheelEvent(event: CWheelEvent): void {
		/** Provides if behavior. */
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
	    this.#m_upButton.setGeometry(this.width() - buttonWidth, 1, 
            buttonWidth - 1, halfHeight - 1);
	    this.#m_downButton.setGeometry(this.width() - buttonWidth, halfHeight, 
            buttonWidth - 1, this.height() - halfHeight - 1);
    }

	#commitEditorValue(): void {
		const text = this.#m_editor.text().trim();
		const parsed = Number.parseInt(text, 10);
		/** Provides if behavior. */
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
