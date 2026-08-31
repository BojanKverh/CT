import { CSignal } from "../core/CSignal.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CLabel } from "../widgets/CLabel.js";
import { CWidget } from "../widgets/CWidget.js";
import { CDialog } from "./CDialog.js";
import { CDialogButtonBox, CStandardButton } from "./CDialogButtonBox.js";

export enum CMessageBoxIcon {
	NoIcon,
	Information,
	Warning,
	Critical,
	Question
}

export class CMessageBox extends CDialog
{
	static readonly DefaultWidth = 360;
	static readonly DefaultHeight = 130;
	static readonly Margin = 12;
	static readonly Spacing = 8;

	#m_text = "";
	#m_informativeText = "";
	#m_icon = CMessageBoxIcon.NoIcon;
	#m_clickedButton = CStandardButton.NoButton;

	#m_textLabel: CLabel;
	#m_informativeLabel: CLabel;
	#m_buttonBox: CDialogButtonBox;

	readonly buttonClicked =
		new CSignal<[CStandardButton]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.#m_textLabel = new CLabel(this);
		this.#m_informativeLabel = new CLabel(this);

		this.#m_buttonBox = new CDialogButtonBox(
			CStandardButton.Ok,
			this
		);

		const layout = new CVBoxLayout();
        layout.setContentsMargins(CMessageBox.Margin, CMessageBox.Margin, CMessageBox.Margin,
	        CMessageBox.Margin);
        layout.setSpacing(CMessageBox.Spacing);
        layout.addWidget(this.#m_textLabel);
        layout.addWidget(this.#m_informativeLabel);
        layout.addStretch(1);
        layout.addWidget(this.#m_buttonBox);
        this.setLayout(layout);

		this.#m_informativeLabel.hide();

		this.#m_buttonBox.clicked.connect(button =>
		{
			this.#m_clickedButton = button;
			this.buttonClicked.emit(button);
		});

		this.#m_buttonBox.accepted.connect(() =>
		{
			this.accept();
		});

		this.#m_buttonBox.rejected.connect(() =>
		{
			this.reject();
		});

		this.resize(
			CMessageBox.DefaultWidth,
			CMessageBox.DefaultHeight
		);
	}

	text(): string
	{
		return this.#m_text;
	}

	setText(text: string): void
	{
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.#m_textLabel.setText(text);
		this.update();
	}

	informativeText(): string
	{
		return this.#m_informativeText;
	}

	setInformativeText(text: string): void
	{
		if (this.#m_informativeText === text)
			return;

		this.#m_informativeText = text;
		this.#m_informativeLabel.setText(text);
		this.#m_informativeLabel.setVisible(text !== "");
		this.update();
	}

	icon(): CMessageBoxIcon
	{
		return this.#m_icon;
	}

	setIcon(icon: CMessageBoxIcon): void
	{
		if (this.#m_icon === icon)
			return;

		this.#m_icon = icon;
		this.update();
	}

	standardButtons(): CStandardButton
	{
		return this.#m_buttonBox.standardButtons();
	}

	setStandardButtons(buttons: CStandardButton): void
	{
		if (this.#m_buttonBox.standardButtons() === buttons)
			return;

		this.#m_clickedButton = CStandardButton.NoButton;
		this.#m_buttonBox.setStandardButtons(buttons);
	}

	clickedButton(): CStandardButton
	{
		return this.#m_clickedButton;
	}

	static information(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Information, buttons);
	}

	static warning(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Warning, buttons);
	}

	static critical(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Critical, buttons);
	}

	static question(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Yes |
			CStandardButton.No): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Question, buttons);
	}

	override open(): void
	{
		this.#m_clickedButton = CStandardButton.NoButton;
		super.open();
	}

	static #show(parent: CWidget | null, title: string, text: string,
		icon: CMessageBoxIcon, buttons: CStandardButton): CMessageBox
	{
		const messageBox = new CMessageBox(parent);

		messageBox.setWindowTitle(title);
		messageBox.setText(text);
        messageBox.setIcon(icon);
		messageBox.setStandardButtons(buttons);
		messageBox.exec();

		return messageBox;
	}
}