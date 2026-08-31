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

export class CProgressDialog extends CDialog
{
	static readonly DefaultWidth = 360;
	static readonly DefaultHeight = 120;
	static readonly Margin = 12;
	static readonly Spacing = 6;

	readonly canceled = new CSignal<[]>();

	#m_label: CLabel;
	#m_progressBar: CProgressBar;
	#m_buttonBox: CDialogButtonBox;

	#m_autoClose = true;
    #m_wasCanceled = false;

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

	labelText(): string
	{
		return this.#m_label.text();
	}

	setLabelText(text: string): void
	{
		this.#m_label.setText(text);
	}

	minimum(): number
	{
		return this.#m_progressBar.minimum();
	}

	setMinimum(minimum: number): void
	{
		this.#m_progressBar.setMinimum(minimum);
	}

	maximum(): number
	{
		return this.#m_progressBar.maximum();
	}

	setMaximum(maximum: number): void
	{
		this.#m_progressBar.setMaximum(maximum);
	}

	setRange(minimum: number, maximum: number): void
	{
		this.#m_progressBar.setRange(minimum, maximum);
	}

	value(): number
	{
		return this.#m_progressBar.value();
	}

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

	autoClose(): boolean
	{
		return this.#m_autoClose;
	}

	setAutoClose(autoClose: boolean): void
	{
		this.#m_autoClose = autoClose;
	}

	wasCanceled(): boolean
	{
		return this.#m_wasCanceled;
	}

	cancel(): void
	{
		if (this.#m_wasCanceled)
			return;

		this.#m_wasCanceled = true;

		this.canceled.emit();
		this.reject();
	}
}