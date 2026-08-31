import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";

export class CProgressBar extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	minimum(): number {
		return this.#m_minimum;
	}

	maximum(): number {
		return this.#m_maximum;
	}

	value(): number {
		return this.#m_value;
	}

	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			maximum = minimum;

		if (
			this.#m_minimum === minimum &&
			this.#m_maximum === maximum
		)
			return;

		this.#m_minimum = minimum;
		this.#m_maximum = maximum;

		this.setValue(this.#m_value);
		this.update();
	}

	setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		if (this.#m_value === clamped)
			return;

		this.#m_value = clamped;
		this.update();
	}

    reset(): void {
		this.setValue(this.#m_minimum);
	}

	override sizeHint(): CSize {
		return new CSize(200, 30);
	}

	protected override paintEvent(painter: CPainter): void {
		this.style().drawProgressBar(painter, this);
	}
}