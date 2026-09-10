import { CSignal } from "../core/CSignal.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CLabel } from "../widgets/CLabel.js";
import { CWidget } from "../widgets/CWidget.js";
import { CDialog } from "./CDialog.js";
import { CDialogButtonBox, CStandardButton } from "./CDialogButtonBox.js";

/**
 * Defines the semantic icon type of a message box.
 */
export enum CMessageBoxIcon {
/**
 * No icon.
 */
	NoIcon,
/**
 * Informational message.
 */
	Information,
/**
 * Warning message.
 */
	Warning,
/**
 * Critical/error message.
 */
	Critical,
/**
 * Question message.
 */
	Question
}

/**
 * Dialog for displaying short messages with standard response buttons.
 */
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

/**
 * Emitted when a standard button is clicked.
 */
	readonly buttonClicked =
		new CSignal<[CStandardButton]>();

/**
 * Creates a message box.
 *
 * @param parent Optional parent widget.
 */
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

/**
 * Returns the primary message text.
 *
 * @returns Primary message text.
 */
	text(): string
	{
		return this.#m_text;
	}

/**
 * Sets the primary message text.
 *
 * @param text Message text.
 */
	setText(text: string): void
	{
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.#m_textLabel.setText(text);
		this.update();
	}

/**
 * Returns the additional informative text.
 *
 * @returns Informative text.
 */
	informativeText(): string
	{
		return this.#m_informativeText;
	}

/**
 * Sets the additional informative text.
 *
 * @param text Informative text; an empty string hides it.
 */
	setInformativeText(text: string): void
	{
		if (this.#m_informativeText === text)
			return;

		this.#m_informativeText = text;
		this.#m_informativeLabel.setText(text);
		this.#m_informativeLabel.setVisible(text !== "");
		this.update();
	}

/**
 * Returns the message icon type.
 *
 * @returns Current icon type.
 */
	icon(): CMessageBoxIcon
	{
		return this.#m_icon;
	}

/**
 * Sets the message icon type.
 *
 * @param icon Icon type to display.
 */
	setIcon(icon: CMessageBoxIcon): void
	{
		if (this.#m_icon === icon)
			return;

		this.#m_icon = icon;
		this.update();
	}

/**
 * Returns the configured standard buttons.
 *
 * @returns Bitwise combination of standard buttons.
 */
	standardButtons(): CStandardButton
	{
		return this.#m_buttonBox.standardButtons();
	}

/**
 * Sets the standard response buttons.
 *
 * @param buttons Bitwise combination of buttons.
 */
	setStandardButtons(buttons: CStandardButton): void
	{
		if (this.#m_buttonBox.standardButtons() === buttons)
			return;

		this.#m_clickedButton = CStandardButton.NoButton;
		this.#m_buttonBox.setStandardButtons(buttons);
	}

/**
 * Returns the last activated standard button.
 *
 * @returns Last clicked button, or `NoButton` if none.
 */
	clickedButton(): CStandardButton
	{
		return this.#m_clickedButton;
	}

/**
 * Shows an informational message box.
 *
 * @param parent Optional parent widget.
 * @param title Dialog title.
 * @param text Message text.
 * @param buttons Bitwise combination of response buttons.
 * @returns The opened message box instance.
 */
	static information(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Information, buttons);
	}

/**
 * Shows a warning message box.
 *
 * @param parent Optional parent widget.
 * @param title Dialog title.
 * @param text Message text.
 * @param buttons Bitwise combination of response buttons.
 * @returns The opened message box instance.
 */
	static warning(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Warning, buttons);
	}

/**
 * Shows a critical-error message box.
 *
 * @param parent Optional parent widget.
 * @param title Dialog title.
 * @param text Message text.
 * @param buttons Bitwise combination of response buttons.
 * @returns The opened message box instance.
 */
	static critical(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Critical, buttons);
	}

/**
 * Shows a question message box.
 *
 * @param parent Optional parent widget.
 * @param title Dialog title.
 * @param text Message text.
 * @param buttons Bitwise combination of response buttons.
 * @returns The opened message box instance.
 */
	static question(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Yes |
			CStandardButton.No): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Question, buttons);
	}

/**
 * Opens the message box and resets the clicked-button state.
 */
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