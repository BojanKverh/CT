import { CApplication } from "../core/CApplication.js";
import { CIcon } from "../gui/CIcon.js";
import { CCanvasPaintDevice } from "../painting/CCanvasPaintDevice.js";
import { CPainter } from "../painting/CPainter.js";
import { CPixmap } from "../painting/CPixmap.js";
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CHBoxLayout } from "../layouts/CHBoxLayout.js";
import { CPushButton } from "../widgets/CPushButton.js";
import { CWidget } from "../widgets/CWidget.js";

/**
 * Bit flags identifying standard dialog buttons.
 */
export enum CStandardButton {
/**
 * No standard button.
 */
	NoButton = 0,
/**
 * Accept/OK button.
 */
	Ok = 1 << 0,
/**
 * Cancel button.
 */
	Cancel = 1 << 1,
/**
 * Apply button.
 */
	Apply = 1 << 2,
/**
 * Close button.
 */
	Close = 1 << 3,
/**
 * Yes button.
 */
	Yes = 1 << 4,
/**
 * No button.
 */
	No = 1 << 5
}

function standardButtonIcon(accept: boolean): CIcon | null {
    const document = CApplication.instance().canvas().ownerDocument;
    if (!document) return null;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    if (!canvas.getContext("2d")) return null;

    const painter = new CPainter(new CCanvasPaintDevice(canvas));
    painter.setPen(accept ? "#219653" : "#e44848");
    painter.setLineWidth(5);
    if (accept) {
        painter.drawLine(6, 16, 13, 23);
        painter.drawLine(13, 23, 26, 9);
    } else {
        painter.drawLine(8, 8, 24, 24);
        painter.drawLine(24, 8, 8, 24);
    }
    return new CIcon(new CPixmap(canvas, 32, 32));
}

/**
 * Widget that manages a standard set of dialog buttons and emits semantic button signals.
 */
export class CDialogButtonBox extends CWidget
{
	static readonly SPACING: number = 3;

	#m_standardButtons = CStandardButton.NoButton;
	#m_layout = new CHBoxLayout();

/**
 * Emitted when an accepting button is activated.
 */
	readonly accepted = new CSignal<[]>();
/**
 * Emitted when a rejecting button is activated.
 */
	readonly rejected = new CSignal<[]>();
/**
 * Emitted when a standard button is activated.
 */
	readonly clicked = new CSignal<[CStandardButton]>();

/**
 * Creates a dialog button box.
 *
 * @param buttons Bitwise combination of standard buttons to display.
 * @param parent Optional parent widget.
 */
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

/**
 * Returns the configured standard buttons.
 *
 * @returns Bitwise combination of standard buttons.
 */
	standardButtons(): CStandardButton
	{
		return this.#m_standardButtons;
	}

/**
 * Sets the standard buttons displayed by the box.
 *
 * @param buttons Bitwise combination of buttons to display.
 */
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
			this.#addButton("OK", true, standardButtonIcon(true));

		if (buttons & CStandardButton.Apply)
			this.#addButton("Apply");

		if (buttons & CStandardButton.Close)
			this.#addButton("Close", false);

		if (buttons & CStandardButton.Cancel)
			this.#addButton("Cancel", false, standardButtonIcon(false));

		this.update();
	}

	#addButton(text: string, accept?: boolean, icon: CIcon | null = null): void
	{
		const button = new CPushButton(this);
		button.setText(text);
        if (icon !== null) button.setIcon(icon);

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
				child.destroy();
		}

		this.#m_layout.clear();
	}

/**
 * Returns the preferred size required by the contained buttons.
 *
 * @returns Preferred widget size.
 */
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
