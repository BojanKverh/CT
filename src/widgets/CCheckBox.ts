import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionCheckBox } from "../gui/CStyleOptionCheckBox.js";

/** Implements the check box widget. */
export class CCheckBox extends CAbstractButton {
	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
		this.setCheckable(true);
	}

	/**
	 * Draws the check box through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionCheckBox();
		option.initFromCheckBox(this);

		this.style().drawCheckBox(painter, option);
	}

	/**
	 * Responds to a pointer button press for the check box. May accept or ignore the event depending on the input.
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
	 * Responds to a pointer button release for the check box. May accept or ignore the event depending on the input. May emit `clicked`.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		/** Provides if behavior. */
		if (!this.rect().contains(event.pos())) {
			event.ignore();
			return;
		}

		this.toggle();
		this.clicked.emit();
		event.accept();
	}

	/**
	 * Responds to a key press for the check box. May accept or ignore the event depending on the input. May emit `clicked`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		this.toggle();
		this.clicked.emit();
		event.accept();
	}
}
