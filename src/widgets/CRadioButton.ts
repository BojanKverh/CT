import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CStyleOptionRadioButton} from "../gui/CStyleOptionRadioButton.js";

export class CRadioButton extends CAbstractButton {
	constructor(text = "", parent: CWidget | null = null) {
		super(parent);
		this.setCheckable(true);
		this.setText(text);
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton || !this.rect().contains(event.pos())) {
			event.ignore();
			return;
		}

		if (!this.isChecked())
			this.setChecked(true);

		this.clicked.emit();
		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.type() !== CEventType.KeyPress) {
			super.keyPressEvent(event);
			return;
		}

		if (event.key() === " ") {
			if (!this.isChecked())
				this.setChecked(true);

			this.clicked.emit();
			event.accept();
			return;
		}

		super.keyPressEvent(event);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionRadioButton();
		option.initFromRadioButton(this);

		this.style().drawRadioButton(painter, option);
	}
}
