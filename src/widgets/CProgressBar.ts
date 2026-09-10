import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CStyleOptionProgressBar } from "../gui/CStyleOptionProgressBar.js";

/** Implements the progress bar widget. */
export class CProgressBar extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/** Returns the minimum . */
	minimum(): number {
		return this.#m_minimum;
	}

	/** Returns the maximum . */
	maximum(): number {
		return this.#m_maximum;
	}

	/** Provides value behavior. */
	value(): number {
		return this.#m_value;
	}

	/** Sets the minimum. */
	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	/** Sets the maximum. */
	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	/** Sets the range. */
	setRange(minimum: number, maximum: number): void {
		/** Provides if behavior. */
		if (minimum > maximum)
			maximum = minimum;

		/** Provides if behavior. */
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

	/** Sets the value. */
	setValue(value: number): void {
		const clamped = Math.max(
			this.#m_minimum,
			Math.min(value, this.#m_maximum)
		);

		/** Provides if behavior. */
		if (this.#m_value === clamped)
			return;

		this.#m_value = clamped;
		this.update();
	}

    /** Provides reset behavior. */
    reset(): void {
		this.setValue(this.#m_minimum);
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(200, 30);
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(this);

		this.style().drawProgressBar(painter, option);
	}
}