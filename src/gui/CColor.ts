/** @module GUI/CColor */
/**
 * Represents an RGBA color value.
 */
export class CColor {
	#m_red: number;
	#m_green: number;
	#m_blue: number;
	#m_alpha: number;

    /**
    * Creates RGBA channels clamped to 0–255. The default is opaque black.
    */
    constructor(red: number = 0, green: number = 0, blue: number = 0, alpha = 255) {
		this.#m_red = CColor.#clamp(red);
		this.#m_green = CColor.#clamp(green);
		this.#m_blue = CColor.#clamp(blue);
		this.#m_alpha = CColor.#clamp(alpha);
	}

    /**
    * Parses #RRGGBB or #RRGGBBAA. Invalid input leaves the color unchanged; six-digit input preserves the existing alpha.
    */
    setColor(color: string): void {
		if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(color))
			return;

		this.#m_red = parseInt(color.slice(1, 3), 16);
		this.#m_green = parseInt(color.slice(3, 5), 16);
		this.#m_blue = parseInt(color.slice(5, 7), 16);
		if (color.length === 9)
			this.#m_alpha = parseInt(color.slice(7, 9), 16);
	}

    /**
    * Assigns the opacity channel directly. Use 0 for transparent and 255 for opaque; this setter does not clamp the input.
    */
    setAlpha(alpha: number)
	{
		this.#m_alpha = alpha;
	}

    /**
    * Red channel in the RGBA representation, normally between 0 and 255.
    */
    red(): number {
		return this.#m_red;
	}

    /**
    * Green channel in the RGBA representation, normally between 0 and 255.
    */
    green(): number {
		return this.#m_green;
	}

    /**
    * Blue channel in the RGBA representation, normally between 0 and 255.
    */
    blue(): number {
		return this.#m_blue;
	}

    /**
    * Opacity channel: 0 is transparent and 255 is opaque. setAlpha() can store values outside this range.
    */
    alpha(): number {
		return this.#m_alpha;
	}

    /**
    * Compares all four stored RGBA channels for exact equality.
    */
    equals(other: CColor): boolean {
		return this.#m_red === other.#m_red
			&& this.#m_green === other.#m_green
			&& this.#m_blue === other.#m_blue
			&& this.#m_alpha === other.#m_alpha;
	}

    /**
    * Returns the color as a CSS color string.
    *
    */
    toCss(): string {
		return `rgba(${this.#m_red}, ${this.#m_green}, ${this.#m_blue}, ${this.#m_alpha / 255})`;
	}

    /**
    * Returns the color as a hexadecimal RGB string.
    *
    */
    toHex(): string {
		const hex = (value: number) => value.toString(16).padStart(2, "0");
		return `#${hex(this.#m_red)}${hex(this.#m_green)}` + `${hex(this.#m_blue)}`;
	}

	static #clamp(value: number): number {
		return Math.max(0, Math.min(255, value));
	}
}