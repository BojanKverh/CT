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
	static readonly DefaultWidth = 360;
	static readonly DefaultHeight = 120;
	static readonly Margin = 12;
	static readonly Spacing = 6;

/**
 * Emitted when the operation is canceled.
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
	 * Reads the message shown above the progress bar.
	 * @returns Current operation label.
	 */
	labelText(): string
	{
		return this.#m_label.text();
	}

/**
	 * Updates the message displayed above the progress bar.
	 * @param text New operation label.
	 */
	setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

/**
	 * Reads the start of the progress range.
	 * @returns Inclusive minimum progress value.
	 */
	minimum(): number
	{
		return this.#m_progressBar.minimum();
	}

/**
	 * Updates the progress bar's lower bound.
	 * @param minimum Requested minimum progress value.
	 */
	setMinimum(minimum: number): void
	{
		this.#m_progressBar.setMinimum(minimum);
	}

/**
	 * Reads the progress value treated as completion.
	 * @returns Inclusive maximum progress value.
	 */
	maximum(): number
	{
		return this.#m_progressBar.maximum();
	}

/**
	 * Updates the progress bar's upper bound.
	 * @param maximum Requested maximum progress value.
	 */
	setMaximum(maximum: number): void
	{
		this.#m_progressBar.setMaximum(maximum);
	}

/**
	 * Updates the progress bar's lower and upper bounds.
	 * @param minimum Requested inclusive minimum progress value.
	 * @param maximum Requested inclusive maximum progress value.
	 */
	setRange(minimum: number, maximum: number): void
	{
		this.#m_progressBar.setRange(minimum, maximum);
	}

/**
	 * Reads the current progress from the bar.
	 * @returns Current value within the configured progress range.
	 */
	value(): number
	{
		return this.#m_progressBar.value();
	}

/**
	 * Updates the progress bar. At the maximum, accepts the dialog when auto-close is enabled or replaces the cancel control with OK otherwise.
	 * @param value Requested progress value, constrained by the progress bar's range.
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
	 * Reads whether reaching maximum progress triggers acceptance.
	 * @returns `true` if automatic acceptance at completion is enabled.
	 */
	autoClose(): boolean
	{
		return this.#m_autoClose;
	}

/**
	 * Changes how subsequent progress updates handle completion.
	 * @param autoClose `true` to accept and close on completion, or `false` to leave the completed dialog open.
	 */
	setAutoClose(autoClose: boolean): void
	{
		this.#m_autoClose = autoClose;
	}

/**
	 * Checks whether cancellation has been requested through `cancel()`.
	 * @returns `true` once a cancellation request was recorded.
	 */
	wasCanceled(): boolean
	{
		return this.#m_wasCanceled;
	}

/** Records cancellation once, emits `canceled` and rejects the dialog if it is open. */
	cancel(): void
	{
		if (this.#m_wasCanceled)
			return;

		this.#m_wasCanceled = true;

		this.canceled.emit();
		this.reject();
	}
}