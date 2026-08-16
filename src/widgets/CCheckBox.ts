import { CSignal } from "../core/CSignal.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

export class CCheckBox extends CWidget {
	readonly toggled = new CSignal<[boolean]>();

	#m_checked = false;
	#m_text = "";

	isChecked(): boolean {
		return this.#m_checked;
	}

	setChecked(checked: boolean): void {
		if (this.#m_checked === checked)
			return;

		this.#m_checked = checked;
		this.update();
		this.toggled.emit(checked);
	}

	toggle(): void {
		this.setChecked(!this.#m_checked);
	}

	text(): string {
		return this.#m_text;
	}

	setText(text: string): void {
		if (this.#m_text === text)
			return;

		this.#m_text = text;
		this.update();
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
		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		this.toggle();
		event.accept();
	}
}