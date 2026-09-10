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

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionCheckBox();
		option.initFromCheckBox(this);

		this.style().drawCheckBox(painter, option);
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

	/** Handles the key press event. */
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
