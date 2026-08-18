import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";

export class CCheckBox extends CAbstractButton {
	constructor(parent: CWidget | null = null) {
		super(parent);
		this.setCheckable(true);
	}

	protected override paintEvent(painter: CPainter): void {
		this.style().drawCheckBox(painter, this);
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
