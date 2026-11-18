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

/**
 * Emitted when the text value changes.
 */
	readonly textValueChanged = new CSignal<[string]>();
/**
 * Emitted when a text value is accepted.
 */
	readonly textValueSelected = new CSignal<[string]>();
/**
 * Emitted when the integer value changes.
 */
	readonly intValueChanged = new CSignal<[number]>();
/**
 * Emitted when an integer value is accepted.
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
	 * Reads which editor is active.
	 * @returns Text or integer input mode.
	 */
	inputMode(): CInputDialogInputMode
	{
		return this.#m_inputMode;
	}

/**
	 * Switches the visible editor and rebuilds the dialog layout without clearing the values stored in either editor.
	 * @param mode Text or integer input mode.
	 */
	setInputMode(mode: CInputDialogInputMode): void
	{
		if (this.#m_inputMode === mode)
			return;

		this.#m_inputMode = mode;
		this.#updateLayout();
	}

/**
	 * Reads the prompt shown above the editor.
	 * @returns Current prompt text.
	 */
	labelText(): string
	{
		return this.#m_label.text();
	}

/**
	 * Changes the prompt displayed above the editor.
	 * @param text Prompt to display.
	 */
	setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

/**
	 * Reads the text editor even when integer mode is active.
	 * @returns Current text editor contents.
	 */
	textValue(): string
	{
		return this.#m_lineEdit.text();
	}

/**
	 * Updates the stored text editor value independently of which editor is visible.
	 * @param text New text editor contents.
	 */
	setTextValue(text: string): void
	{
		this.#m_lineEdit.setText(text);
	}

/**
	 * Reads the spin box's current committed numeric value.
	 * @returns Integer value in the configured range.
	 */
	intValue(): number
	{
		return this.#m_spinBox.value();
	}

/**
	 * Sets the spin box value using its integer normalization and range constraints.
	 * @param value Requested numeric value to store.
	 */
	setIntValue(value: number): void
	{
		this.#m_spinBox.setValue(value);
	}

/**
	 * Reads the spin box's lower bound.
	 * @returns Minimum accepted integer, inclusive.
	 */
	intMinimum(): number
	{
		return this.#m_spinBox.minimum();
	}

/**
	 * Changes the lower bound used for integer input.
	 * @param minimum Requested inclusive integer minimum.
	 */
	setIntMinimum(minimum: number): void
	{
		this.#m_spinBox.setMinimum(minimum);
	}

/**
	 * Reads the spin box's upper bound.
	 * @returns Maximum accepted integer, inclusive.
	 */
	intMaximum(): number
	{
		return this.#m_spinBox.maximum();
	}

/**
	 * Changes the upper bound used for integer input.
	 * @param maximum Requested inclusive integer maximum.
	 */
	setIntMaximum(maximum: number): void
	{
		this.#m_spinBox.setMaximum(maximum);
	}

/**
	 * Changes both bounds used for integer input.
	 * @param minimum Requested inclusive integer minimum.
	 * @param maximum Requested inclusive integer maximum.
	 */
	setIntRange(minimum: number, maximum: number): void
	{
		this.#m_spinBox.setRange(minimum, maximum);
	}

/**
	 * Reads the spin box increment.
	 * @returns Integer amount used by step controls.
	 */
	intStep(): number
	{
		return this.#m_spinBox.singleStep();
	}

/**
	 * Changes the increment used by the spin box's step controls.
	 * @param step Requested positive integer step.
	 */
	setIntStep(step: number): void
	{
		this.#m_spinBox.setSingleStep(step);
	}

/**
	 * Opens a modal dialog that prompts for text.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param label Prompt shown above the editor.
	 * @param value Initial text. Defaults to an empty string.
	 * @returns A promise resolving to the accepted text or `null` when rejected.
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
	 * Opens a modal dialog with a spin box and applies the range and increment before setting the initial value.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param label Prompt shown above the editor.
	 * @param value Requested initial integer value. Defaults to zero.
	 * @param minimum Inclusive lower bound. Defaults to `-2147483647`.
	 * @param maximum Inclusive upper bound. Defaults to `2147483647`.
	 * @param step Spin box increment. Defaults to one.
	 * @returns A promise resolving to the accepted integer or `null` when rejected.
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
