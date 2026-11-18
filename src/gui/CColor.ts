/**
 * Represents an RGBA color value.
 */
export class CColor {
	#m_red: number;
	#m_green: number;
	#m_blue: number;
	#m_alpha: number;

		/**
	 * Creates a new CColor instance.
	 *
	 * @param red Red.
	 * @param green Green.
	 * @param blue Blue.
	 * @param alpha Alpha.
	 */
constructor(red: number = 0, green: number = 0, blue: number = 0, alpha = 255) {
		this.#m_red = CColor.#clamp(red);
		this.#m_green = CColor.#clamp(green);
		this.#m_blue = CColor.#clamp(blue);
		this.#m_alpha = CColor.#clamp(alpha);
	}

		/**
	 * Assigns a color to the specified palette role.
	 *
	 * @param color Color.
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
	 * Sets the alpha.
	 *
	 * @param alpha Alpha.
	 */
setAlpha(alpha: number)
	{
		this.#m_alpha = alpha;
	}

		/**
 * Reads the red channel.
 * @returns Red intensity from 0 through 255.
 */
red(): number {
		return this.#m_red;
	}

		/**
 * Reads the green channel.
 * @returns Green intensity from 0 through 255.
 */
green(): number {
		return this.#m_green;
	}

		/**
 * Reads the blue channel.
 * @returns Blue intensity from 0 through 255.
 */
blue(): number {
		return this.#m_blue;
	}

		/**
 * Reads the alpha channel.
 * @returns Alpha intensity from 0 through 255.
 */
alpha(): number {
		return this.#m_alpha;
	}

		/**
 * Compares the red, green, blue and alpha channels exactly.
 * @param other Color to compare.
 * @returns `true` if all four channels match.
 */
equals(other: CColor): boolean {
		return this.#m_red === other.#m_red
			&& this.#m_green === other.#m_green
			&& this.#m_blue === other.#m_blue
			&& this.#m_alpha === other.#m_alpha;
	}

		/**
 * Serializes the color as CSS RGBA with normalized alpha.
 * @returns CSS `rgba(...)` string with alpha between zero and one.
 */
toCss(): string {
		return `rgba(${this.#m_red}, ${this.#m_green}, ${this.#m_blue}, ${this.#m_alpha / 255})`;
	}

		/**
 * Serializes the red, green and blue channels as hexadecimal.
 * @returns A `#rrggbb` string. Alpha is omitted.
 */
toHex(): string {
		const hex = (value: number) => value.toString(16).padStart(2, "0");
		return `#${hex(this.#m_red)}${hex(this.#m_green)}` + `${hex(this.#m_blue)}`;
	}

	static #clamp(value: number): number {
		return Math.max(0, Math.min(255, value));
	}
}