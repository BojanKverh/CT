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
	 * Reads the primary message.
	 * @returns The current primary message text.
	 */
	text(): string
	{
		return this.#m_text;
	}

/**
	 * Changes the primary message label and requests repainting if the text differs.
	 * @param text New primary message.
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
	 * Reads the secondary message.
	 * @returns The current informative text, which may be empty.
	 */
	informativeText(): string
	{
		return this.#m_informativeText;
	}

/**
	 * Changes the secondary message and shows its label only when the text is nonempty.
	 * @param text Informative text, or an empty string to hide the label.
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
	 * Reads the message category shown by the icon.
	 * @returns Current `CMessageBoxIcon` value.
	 */
	icon(): CMessageBoxIcon
	{
		return this.#m_icon;
	}

/**
	 * Changes the message icon and requests repainting when its category changes.
	 * @param icon Icon category to display.
	 */
	setIcon(icon: CMessageBoxIcon): void
	{
		if (this.#m_icon === icon)
			return;

		this.#m_icon = icon;
		this.update();
	}

/**
	 * Reads the response buttons configured for the message box.
	 * @returns Bitwise mask of standard response buttons.
	 */
	standardButtons(): CStandardButton
	{
		return this.#m_buttonBox.standardButtons();
	}

/**
	 * Rebuilds the response buttons when their mask changes and clears the recorded response.
	 * @param buttons Bitwise mask of standard response buttons to display.
	 */
	setStandardButtons(buttons: CStandardButton): void
	{
		if (this.#m_buttonBox.standardButtons() === buttons)
			return;

		this.#m_clickedButton = CStandardButton.NoButton;
		this.#m_buttonBox.setStandardButtons(buttons);
	}

/**
	 * Reads the most recently activated standard response.
	 * @returns Activated button, or `NoButton` when none has been recorded.
	 */
	clickedButton(): CStandardButton
	{
		return this.#m_clickedButton;
	}

/**
	 * Opens a modal message box with the information icon.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param text Primary message to display.
	 * @param buttons Bitwise mask of responses to show. Defaults to OK.
	 * @returns The opened message box. Observe its result signals or inspect `clickedButton()` to obtain the response.
	 */
	static information(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Information, buttons);
	}

/**
	 * Opens a modal message box with the warning icon.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param text Primary message to display.
	 * @param buttons Bitwise mask of responses to show. Defaults to OK.
	 * @returns The opened message box. Observe its result signals or inspect `clickedButton()` to obtain the response.
	 */
	static warning(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Warning, buttons);
	}

/**
	 * Opens a modal message box with the critical error icon.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param text Primary message to display.
	 * @param buttons Bitwise mask of responses to show. Defaults to OK.
	 * @returns The opened message box. Observe its result signals or inspect `clickedButton()` to obtain the response.
	 */
	static critical(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Ok): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Critical, buttons);
	}

/**
	 * Opens a modal message box with the question icon.
	 * @param parent Parent widget that owns the dialog, or `null` for a top-level dialog.
	 * @param title Text shown in the title bar.
	 * @param text Primary message to display.
	 * @param buttons Bitwise mask of responses to show. Defaults to Yes and No.
	 * @returns The opened message box. Observe its result signals or inspect `clickedButton()` to obtain the response.
	 */
	static question(parent: CWidget | null, title: string, text: string,
		buttons = CStandardButton.Yes |
			CStandardButton.No): CMessageBox
	{
		return CMessageBox.#show(parent, title, text,
			CMessageBoxIcon.Question, buttons);
	}

/** Clears the recorded button and opens the message box through the base dialog. */
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