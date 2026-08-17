import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";

export class CGroupBox extends CWidget {
	#m_title: string;

	constructor(title = "", parent: CWidget | null = null) {
		super(parent);

		this.#m_title = title;
	}

	title(): string {
		return this.#m_title;
	}

	setTitle(title: string): void {
		if (this.#m_title === title)
			return;

		this.#m_title = title;
		this.update();
	}

    protected override paintEvent(painter: CPainter): void {
		this.style().drawGroupBox(painter, this);
	}
}