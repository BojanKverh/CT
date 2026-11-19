/** @module Dialogs/CInputDialog */
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

/**
 * Defines the value type edited by an input dialog.
 */
export enum CInputDialogInputMode {
    /**
    * Text input mode.
    */
    TextInput,
    /**
    * Integer input mode.
    */
    IntInput
}

/**
 * Dialog for requesting a text or integer value from the user.
 */
export class CInputDialog extends CDialog
{
    /** Default preferred logical width. */
    static readonly DefaultWidth = 360;
    /** Default preferred logical height. */
    static readonly DefaultHeight = 120;
    /** Default logical inset around contents. */
    static readonly Margin = 12;
    /** Default logical gap between adjacent items. */
    static readonly Spacing = 8;

	#m_label: CLabel;
	#m_buttonBox: CDialogButtonBox;
	#m_lineEdit: CLineEdit;
	#m_spinBox: CSpinBox;
	#m_layout: CVBoxLayout;
	#m_inputMode = CInputDialogInputMode.TextInput;

    /**
    * Emitted when the text value changes.
    * @group Signals
    */
    readonly textValueChanged = new CSignal<[string]>();
    /**
    * Emitted when a text value is accepted.
    * @group Signals
    */
    readonly textValueSelected = new CSignal<[string]>();
    /**
    * Emitted when the integer value changes.
    * @group Signals
    */
    readonly intValueChanged = new CSignal<[number]>();
    /**
    * Emitted when an integer value is accepted.
    * @group Signals
    */
    readonly intValueSelected = new CSignal<[number]>();

    /**
    * Creates an input dialog.
    *
    * @param parent Optional parent widget.
    */
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

    /**
    * Returns whether the dialog edits text, integers or floating-point values.
    */
    inputMode(): CInputDialogInputMode
	{
		return this.#m_inputMode;
	}

    /**
    * Selects the input control used to collect a value.
    */
    setInputMode(mode: CInputDialogInputMode): void
	{
		if (this.#m_inputMode === mode)
			return;

		this.#m_inputMode = mode;
		this.#updateLayout();
	}

    /**
    * Returns the prompt label text.
    *
    * @returns The current label text.
    */
    labelText(): string
	{
		return this.#m_label.text();
	}

    /**
    * Sets the prompt label text.
    *
    * @param text New label text.
    */
    setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

    /**
    * Returns the retained text-input value.
    */
    textValue(): string
	{
		return this.#m_lineEdit.text();
	}

    /**
    * Replaces the text editor's current input.
    */
    setTextValue(text: string): void
	{
		this.#m_lineEdit.setText(text);
	}

    /**
    * Returns the current integer value.
    *
    * @returns The current integer value.
    */
    intValue(): number
	{
		return this.#m_spinBox.value();
	}

    /**
    * Sets the current integer value.
    *
    * @param value New integer value.
    */
    setIntValue(value: number): void
	{
		this.#m_spinBox.setValue(value);
	}

    /**
    * Returns the minimum allowed integer value.
    *
    * @returns Minimum integer value.
    */
    intMinimum(): number
	{
		return this.#m_spinBox.minimum();
	}

    /**
    * Sets the minimum allowed integer value.
    *
    * @param minimum Minimum value.
    */
    setIntMinimum(minimum: number): void
	{
		this.#m_spinBox.setMinimum(minimum);
	}

    /**
    * Returns the maximum allowed integer value.
    *
    * @returns Maximum integer value.
    */
    intMaximum(): number
	{
		return this.#m_spinBox.maximum();
	}

    /**
    * Sets the maximum allowed integer value.
    *
    * @param maximum Maximum value.
    */
    setIntMaximum(maximum: number): void
	{
		this.#m_spinBox.setMaximum(maximum);
	}

    /**
    * Sets the allowed integer range.
    *
    * @param minimum Minimum value.
    * @param maximum Maximum value.
    */
    setIntRange(minimum: number, maximum: number): void
	{
		this.#m_spinBox.setRange(minimum, maximum);
	}

    /**
    * Returns the integer step size.
    *
    * @returns Current step size.
    */
    intStep(): number
	{
		return this.#m_spinBox.singleStep();
	}

    /**
    * Sets the integer step size.
    *
    * @param step Step size.
    */
    setIntStep(step: number): void
	{
		this.#m_spinBox.setSingleStep(step);
	}

    /**
    * Shows a modal dialog and requests a text value.
    *
    * @param parent Optional parent widget.
    * @param title Dialog title.
    * @param label Prompt label.
    * @param value Initial text value.
    * @returns A promise resolving to the selected text, or `null` if rejected.
    */
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

    /**
    * Shows a modal dialog and requests an integer value.
    *
    * @param parent Optional parent widget.
    * @param title Dialog title.
    * @param label Prompt label.
    * @param value Initial value.
    * @param minimum Minimum allowed value.
    * @param maximum Maximum allowed value.
    * @param step Step size.
    * @returns A promise resolving to the selected integer, or `null` if rejected.
    */
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
