/** @module Widgets/CCheckBox */
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CStyleOptionCheckBox } from "../gui/CStyleOptionCheckBox.js";

/** Checkable boolean control emitting toggled when its state changes. */
export class CCheckBox extends CAbstractButton {

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
		this.setCheckable(true);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionCheckBox();
		option.initFromCheckBox(this);

		this.style().drawCheckBox(painter, option);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		if (!this.rect().contains(event.pos())) {
			event.ignore();
			return;
		}

		this.toggle();
		this.clicked.emit();
		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		this.toggle();
		this.clicked.emit();
		event.accept();
	}
}
