import { CSignal } from "../core/CSignal.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CLabel } from "../widgets/CLabel.js";
import { CLineEdit } from "../widgets/CLineEdit.js";
import { CSpinBox } from "../widgets/CSpinBox.js";
import { CWidget } from "../widgets/CWidget.js";
import { CDialog } from "./CDialog.js";
import {
	CDialogButtonBox,
	CStandardButton
} from "./CDialogButtonBox.js";

export enum CInputDialogInputMode {
	TextInput,
	IntInput
}

export class CInputDialog extends CDialog
{
	static readonly DefaultWidth = 360;
	static readonly DefaultHeight = 120;
	static readonly Margin = 12;
	static readonly Spacing = 8;

	#m_label: CLabel;
	#m_buttonBox: CDialogButtonBox;
	#m_lineEdit: CLineEdit;
	#m_spinBox: CSpinBox;
	#m_layout: CVBoxLayout;
	#m_inputMode = CInputDialogInputMode.TextInput;

	readonly textValueChanged = new CSignal<[string]>();
	readonly textValueSelected = new CSignal<[string]>();
	readonly intValueChanged = new CSignal<[number]>();
	readonly intValueSelected = new CSignal<[number]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.#m_label = new CLabel(this);
		this.#m_lineEdit = new CLineEdit(this);
		this.#m_spinBox = new CSpinBox(this);

		this.#m_buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel,
			this
		);

		this.#m_layout = new CVBoxLayout();

		this.#m_layout.setContentsMargins(
			CInputDialog.Margin,
			CInputDialog.Margin,
			CInputDialog.Margin,
			CInputDialog.Margin
		);

		this.#m_layout.setSpacing(CInputDialog.Spacing);
		this.setLayout(this.#m_layout);
		this.#updateLayout();

		this.#m_lineEdit.textChanged.connect(text =>
		{
			this.textValueChanged.emit(text);
		});

		this.#m_spinBox.valueChanged.connect(value =>
		{
			this.intValueChanged.emit(value);
		});

		this.#m_buttonBox.accepted.connect(() =>
		{
			if (this.#m_inputMode === CInputDialogInputMode.TextInput)
				this.textValueSelected.emit(this.textValue());
			else
				this.intValueSelected.emit(this.intValue());

			this.accept();
		});

		this.#m_buttonBox.rejected.connect(() =>
		{
			this.reject();
		});

		this.resize(
			CInputDialog.DefaultWidth,
			CInputDialog.DefaultHeight
		);
	}

	inputMode(): CInputDialogInputMode
	{
		return this.#m_inputMode;
	}

	setInputMode(mode: CInputDialogInputMode): void
	{
		if (this.#m_inputMode === mode)
			return;

		this.#m_inputMode = mode;
		this.#updateLayout();
	}

	labelText(): string
	{
		return this.#m_label.text();
	}

	setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

	textValue(): string
	{
		return this.#m_lineEdit.text();
	}

	setTextValue(text: string): void
	{
		this.#m_lineEdit.setText(text);
	}

	intValue(): number
	{
		return this.#m_spinBox.value();
	}

	setIntValue(value: number): void
	{
		this.#m_spinBox.setValue(value);
	}

	intMinimum(): number
	{
		return this.#m_spinBox.minimum();
	}

	setIntMinimum(minimum: number): void
	{
		this.#m_spinBox.setMinimum(minimum);
	}

	intMaximum(): number
	{
		return this.#m_spinBox.maximum();
	}

	setIntMaximum(maximum: number): void
	{
		this.#m_spinBox.setMaximum(maximum);
	}

	setIntRange(minimum: number, maximum: number): void
	{
		this.#m_spinBox.setRange(minimum, maximum);
	}

	intStep(): number
	{
		return this.#m_spinBox.singleStep();
	}

	setIntStep(step: number): void
	{
		this.#m_spinBox.setSingleStep(step);
	}

	static getText(
		parent: CWidget | null,
		title: string,
		label: string,
		value = ""
	): Promise<string | null>
	{
		return new Promise(resolve =>
		{
			const dialog = new CInputDialog(parent);

			dialog.setWindowTitle(title);
			dialog.setLabelText(label);
			dialog.setTextValue(value);

			dialog.accepted.connect(() =>
			{
				resolve(dialog.textValue());
			});

			dialog.rejected.connect(() =>
			{
				resolve(null);
			});

			dialog.exec();
		});
	}

	static getInt(
		parent: CWidget | null,
		title: string,
		label: string,
		value = 0,
		minimum = -2147483647,
		maximum = 2147483647,
		step = 1
	): Promise<number | null>
	{
		return new Promise(resolve =>
		{
			const dialog = new CInputDialog(parent);

			dialog.setWindowTitle(title);
			dialog.setLabelText(label);
			dialog.setInputMode(CInputDialogInputMode.IntInput);
			dialog.setIntRange(minimum, maximum);
			dialog.setIntStep(step);
			dialog.setIntValue(value);

			dialog.accepted.connect(() =>
			{
				resolve(dialog.intValue());
			});

			dialog.rejected.connect(() =>
			{
				resolve(null);
			});

			dialog.exec();
		});
	}

	#updateLayout(): void
	{
		this.#m_layout.clear();
		this.#m_layout.addWidget(this.#m_label);

		if (this.#m_inputMode === CInputDialogInputMode.TextInput) {
			this.#m_spinBox.hide();
			this.#m_lineEdit.show();
			this.#m_layout.addWidget(this.#m_lineEdit);
		}
		else {
			this.#m_lineEdit.hide();
			this.#m_spinBox.show();
			this.#m_layout.addWidget(this.#m_spinBox);
		}

		this.#m_layout.addStretch(1);
		this.#m_layout.addWidget(this.#m_buttonBox);
	}
}
