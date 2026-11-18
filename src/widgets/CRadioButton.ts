import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CStyleOptionRadioButton} from "../gui/CStyleOptionRadioButton.js";

/** Implements the radio button widget. */
export class CRadioButton extends CAbstractButton {
	/** Creates a new instance. */
	constructor(text = "", parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.setCheckable(true);
		this.setText(text);
	}

	/**
	 * Responds to a pointer button press for the radio button. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	/**
	 * Responds to a pointer button release for the radio button. May accept or ignore the event depending on the input. May emit `clicked`.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton || !this.rect().contains(event.pos())) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (!this.isChecked())
			this.setChecked(true);

		this.clicked.emit();
		event.accept();
	}

	/**
	 * Responds to a key press for the radio button. May accept the event. May emit `clicked`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.type() !== CEventType.KeyPress) {
			super.keyPressEvent(event);
			return;
		}

		/** Provides if behavior. */
		if (event.key() === " ") {
			/** Provides if behavior. */
			if (!this.isChecked())
				this.setChecked(true);

			this.clicked.emit();
			event.accept();
			return;
		}

		super.keyPressEvent(event);
	}

	/**
	 * Draws the radio button through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionRadioButton();
		option.initFromRadioButton(this);

		this.style().drawRadioButton(painter, option);
	}
}
