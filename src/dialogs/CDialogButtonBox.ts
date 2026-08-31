import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CHBoxLayout } from "../layouts/CHBoxLayout.js";
import { CPushButton } from "../widgets/CPushButton.js";
import { CWidget } from "../widgets/CWidget.js";

export enum CStandardButton {
	NoButton = 0,
	Ok = 1 << 0,
	Cancel = 1 << 1,
	Apply = 1 << 2,
	Close = 1 << 3,
	Yes = 1 << 4,
	No = 1 << 5
}

export class CDialogButtonBox extends CWidget
{
	static readonly SPACING: number = 3;

	#m_standardButtons = CStandardButton.NoButton;
	#m_layout = new CHBoxLayout();

	readonly accepted = new CSignal<[]>();
	readonly rejected = new CSignal<[]>();
	readonly clicked = new CSignal<[CStandardButton]>();

	constructor(
		buttons = CStandardButton.NoButton,
		parent: CWidget | null = null
	)
	{
		super(parent);

		this.#m_layout.setContentsMargins(0, 0, 0, 0);
		this.#m_layout.setSpacing(6);
		this.setLayout(this.#m_layout);

		this.setStandardButtons(buttons);
	}

	standardButtons(): CStandardButton
	{
		return this.#m_standardButtons;
	}

	setStandardButtons(buttons: CStandardButton): void
	{
		if (this.#m_standardButtons === buttons)
			return;

		this.#clearButtons();

		this.#m_standardButtons = buttons;

		this.#m_layout.addStretch(1);

		if (buttons & CStandardButton.Yes)
			this.#addButton("Yes", true);

		if (buttons & CStandardButton.No)
			this.#addButton("No", false);

		if (buttons & CStandardButton.Ok)
			this.#addButton("OK", true);

		if (buttons & CStandardButton.Apply)
			this.#addButton("Apply");

		if (buttons & CStandardButton.Close)
			this.#addButton("Close", false);

		if (buttons & CStandardButton.Cancel)
			this.#addButton("Cancel", false);

		this.update();
	}

	#addButton(text: string, accept?: boolean): void
	{
		const button = new CPushButton(this);
		button.setText(text);

		button.clicked.connect(() =>
		{
			if (accept === true)
				this.accepted.emit();
			else if (accept === false)
				this.rejected.emit();
		});

		this.#m_layout.addWidget(button);
	}

	#clearButtons(): void
	{
		for (const child of [...this.children()]) {
			if (child instanceof CPushButton)
				child.setParent(null);
		}

		this.#m_layout.clear();
	}

	override sizeHint(): CSize {
		const n = this.#m_layout.count();
		let w = 0;
		let h = 0;
		for (let i = 0; i < n; ++i) {
			const widget = this.#m_layout.widgetAt(i);
			if (widget) {
				w += widget.sizeHint().width();
				h = Math.max(h, widget.sizeHint().height());
			}
		}

		return new CSize(w + (n - 1) * CDialogButtonBox.SPACING, h);
	}
}