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

	/** Handles the mouse press event. */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	/** Handles the mouse release event. */
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

	/** Handles the key press event. */
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

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionRadioButton();
		option.initFromRadioButton(this);

		this.style().drawRadioButton(painter, option);
	}
}
