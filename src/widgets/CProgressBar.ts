/** @module Widgets/CProgressBar */
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CStyleOptionProgressBar } from "../gui/CStyleOptionProgressBar.js";

/** Bounded progress display whose fill follows its current value and range. */
export class CProgressBar extends CWidget {
	#m_minimum = 0;
	#m_maximum = 100;
	#m_value = 0;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);
	}

    /**
    * Lower permitted value.
    * The initial value is `0`.
    */
    minimum(): number {
		return this.#m_minimum;
	}

    /**
    * Upper permitted value.
    * The initial value is `100`.
    */
    maximum(): number {
		return this.#m_maximum;
	}

    /**
    * Current numeric value.
    * The initial value is `0`.
    */
    value(): number {
		return this.#m_value;
	}

    /**
    * Changes the lower bound through setRange().
    */
    setMinimum(minimum: number): void {
		this.setRange(minimum, this.#m_maximum);
	}

    /**
    * Changes the upper bound through setRange().
    */
    setMaximum(maximum: number): void {
		this.setRange(this.#m_minimum, maximum);
	}

    /**
    * Sets progress bounds. If minimum exceeds maximum, maximum becomes minimum. Re-clamps the stored value.
    */
    setRange(minimum: number, maximum: number): void {
		if (minimum > maximum)
			/**
			 * Returns the upper progress bound. Defaults to 100.
			 */
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

    /**
    * Clamps the supplied progress value to the configured range and repaints only when the stored value changes.
    */
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

    /**
    * Returns progress to the configured minimum.
    */
    reset(): void {
		this.setValue(this.#m_minimum);
	}

	override sizeHint(): CSize {
		return new CSize(200, 30);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(this);

		this.style().drawProgressBar(painter, option);
	}
}