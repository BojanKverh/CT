/** @module Dialogs/CProgressDialog */
import { CSignal } from "../core/CSignal.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CLabel } from "../widgets/CLabel.js";
import { CProgressBar } from "../widgets/CProgressBar.js";
import type { CWidget } from "../widgets/CWidget.js";
import { CDialog } from "./CDialog.js";
import {
	CDialogButtonBox,
	CStandardButton
} from "./CDialogButtonBox.js";

/**
 * Dialog that displays progress for a long-running operation and optionally allows cancellation.
 */
export class CProgressDialog extends CDialog
{
    /** Default preferred logical width. */
    static readonly DefaultWidth = 360;
    /** Default preferred logical height. */
    static readonly DefaultHeight = 120;
    /** Default logical inset around contents. */
    static readonly Margin = 12;
    /** Default logical gap between adjacent items. */
    static readonly Spacing = 6;

    /**
    * Emitted when the operation is canceled.
    * @group Signals
    */
    readonly canceled = new CSignal<[]>();

	#m_label: CLabel;
	#m_progressBar: CProgressBar;
	#m_buttonBox: CDialogButtonBox;

	#m_autoClose = true;
    #m_wasCanceled = false;

    /**
    * Creates a progress dialog.
    *
    * @param labelText Text describing the operation.
    * @param cancelButton Whether to show a Cancel button.
    * @param minimum Minimum progress value.
    * @param maximum Maximum progress value.
    * @param parent Optional parent widget.
    */
    constructor(labelText = "", cancelButton = true, minimum = 0, maximum = 100,
		parent: CWidget | null = null)
	{
		super(parent);

        this.setWindowTitle(labelText);
		this.#m_label = new CLabel(this);
        this.#m_label.setText(labelText);
		this.#m_progressBar = new CProgressBar(this);
        this.#m_buttonBox = new CDialogButtonBox(cancelButton? CStandardButton.Cancel : 
            CStandardButton.NoButton, this);

		this.#m_progressBar.setRange(minimum, maximum);

		const layout = new CVBoxLayout();

		layout.setContentsMargins(
			CProgressDialog.Margin,
			CProgressDialog.Margin,
			CProgressDialog.Margin,
			CProgressDialog.Margin
		);

		layout.setSpacing(CProgressDialog.Spacing);

		layout.addWidget(this.#m_label);
		layout.addWidget(this.#m_progressBar);
		layout.addStretch(1);
		layout.addWidget(this.#m_buttonBox);

		this.setLayout(layout);

		this.#m_buttonBox.rejected.connect(() =>
		{
			this.cancel();
		});

		this.resize(
			CProgressDialog.DefaultWidth,
			CProgressDialog.DefaultHeight
		);

        this.#m_buttonBox.accepted.connect(() => {
            this.accept();
        });
        this.#m_buttonBox.rejected.connect(() => {
            this.reject();
        })

	}

    /**
    * Returns the operation label text.
    *
    * @returns Current label text.
    */
    labelText(): string
	{
		return this.#m_label.text();
	}

    /**
    * Sets the operation label text.
    *
    * @param text New label text.
    */
    setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

    /**
    * Returns the minimum progress value.
    *
    * @returns Minimum value.
    */
    minimum(): number
	{
		return this.#m_progressBar.minimum();
	}

    /**
    * Sets the minimum progress value.
    *
    * @param minimum Minimum value.
    */
    setMinimum(minimum: number): void
	{
		this.#m_progressBar.setMinimum(minimum);
	}

    /**
    * Returns the maximum progress value.
    *
    * @returns Maximum value.
    */
    maximum(): number
	{
		return this.#m_progressBar.maximum();
	}

    /**
    * Sets the maximum progress value.
    *
    * @param maximum Maximum value.
    */
    setMaximum(maximum: number): void
	{
		this.#m_progressBar.setMaximum(maximum);
	}

    /**
    * Sets the progress range.
    *
    * @param minimum Minimum value.
    * @param maximum Maximum value.
    */
    setRange(minimum: number, maximum: number): void
	{
		this.#m_progressBar.setRange(minimum, maximum);
	}

    /**
    * Returns the current progress value.
    *
    * @returns Current value.
    */
    value(): number
	{
		return this.#m_progressBar.value();
	}

    /**
    * Sets the current progress value.
    *
    * @param value New progress value.
    */
    setValue(value: number): void
	{
		this.#m_progressBar.setValue(value);

		if (this.value() >= this.maximum()) {
            if (this.#m_autoClose)
			    this.accept();
            else {
                this.#m_buttonBox.setStandardButtons(CStandardButton.Ok);
                this.layout()?.update();
            }
        }
	}

    /**
    * Returns whether completion automatically accepts and closes the dialog.
    *
    * @returns `true` when auto-close is enabled.
    */
    autoClose(): boolean
	{
		return this.#m_autoClose;
	}

    /**
    * Enables or disables automatic closing on completion.
    *
    * @param autoClose `true` to close automatically at the maximum value.
    */
    setAutoClose(autoClose: boolean): void
	{
		this.#m_autoClose = autoClose;
	}

    /**
    * Returns whether the user canceled the operation.
    *
    * @returns `true` if cancellation was requested.
    */
    wasCanceled(): boolean
	{
		return this.#m_wasCanceled;
	}

    /**
    * Marks the operation as canceled, emits `canceled`, and rejects the dialog.
    */
    cancel(): void
	{
		if (this.#m_wasCanceled)
			return;

		this.#m_wasCanceled = true;

		this.canceled.emit();
		this.reject();
	}
}