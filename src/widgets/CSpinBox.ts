import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CLineEdit } from "../widgets/CLineEdit.js";
import { CPushButton } from "./CPushButton.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../../src/events/CWheelEvent.js";

export class CSpinBox extends CWidget {
    #m_editor = new CLineEdit(this);
	#m_upButton = new CPushButton(this);
	#m_downButton = new CPushButton(this);

	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;
	#m_singleStep = 1;

	readonly valueChanged = new CSignal<[number]>();

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_editor.setValidator(text => {
			return /^-?\d*$/.test(text);
		});
		
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
	    const clamped = Math.max(this.#m_minimum, Math.min(value, this.#m_maximum));
	    if (clamped === this.#m_value)
		    return;

	    this.#m_value = clamped;
	    this.#m_editor.setText(String(this.#m_value));
	    this.valueChanged.emit(this.#m_value);
	    this.update();
    }

	setSingleStep(step: number): void {
		this.#m_singleStep = Math.max(0, step);
	}

	stepUp(): void {
		this.setValue(this.#m_value + this.#m_singleStep);
	}

	stepDown(): void {
		this.setValue(this.#m_value - this.#m_singleStep);
	}

	lineEdit(): CLineEdit {
		return this.#m_editor;
	}

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#updateChildGeometry();
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
	    this.#m_upButton.setGeometry(this.width() - buttonWidth, 1, 
            buttonWidth - 1, halfHeight - 1);
	    this.#m_downButton.setGeometry(this.width() - buttonWidth, halfHeight, 
            buttonWidth - 1, this.height() - halfHeight - 1);
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