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

	/**
	 * Returns the minimum .
	 * @returns The minimum.
	 */
	minimum(): number {
		return this.#m_minimum;
	}

	/**
	 * Returns the maximum .
	 * @returns The maximum.
	 */
	maximum(): number {
		return this.#m_maximum;
	}

	/**
	 * Reads the value.
	 * @returns The value.
	 */
	value(): number {
		return this.#m_value;
	}

	/**
	 * Sets the minimum.
	 * @param minimum Minimum.
	 */
	setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

	/**
	 * Sets the maximum.
	 * @param maximum Maximum.
	 */
	setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

	/**
	 * Sets the range.
	 * @param minimum Minimum.
	 * @param maximum Maximum.
	 */
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

	/**
	 * Sets the value.
	 * @param value New value.
	 */
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

    /** Returns progress to the configured minimum. */
    reset(): void {
		this.setValue(this.#m_minimum);
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize {
		return new CSize(200, 30);
	}

	/**
	 * Draws the progress bar through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(this);

		this.style().drawProgressBar(painter, option);
	}
}