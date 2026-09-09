export class CColor {
	#m_red: number;
	#m_green: number;
	#m_blue: number;
	#m_alpha: number;

	constructor(red: number = 0, green: number = 0, blue: number = 0, alpha = 255) {
		this.#m_red = CColor.#clamp(red);
		this.#m_green = CColor.#clamp(green);
		this.#m_blue = CColor.#clamp(blue);
		this.#m_alpha = CColor.#clamp(alpha);
	}

	setColor(color: string): void {
		if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(color))
			return;

		this.#m_red = parseInt(color.slice(1, 3), 16);
		this.#m_green = parseInt(color.slice(3, 5), 16);
		this.#m_blue = parseInt(color.slice(5, 7), 16);
		if (color.length === 9)
			this.#m_alpha = parseInt(color.slice(7, 9), 16);
	}

	setAlpha(alpha: number)
	{
		this.#m_alpha = alpha;
	}

	red(): number {
		return this.#m_red;
	}

	green(): number {
		return this.#m_green;
	}

	blue(): number {
		return this.#m_blue;
	}

	alpha(): number {
		return this.#m_alpha;
	}

	equals(other: CColor): boolean {
		return this.#m_red === other.#m_red
			&& this.#m_green === other.#m_green
			&& this.#m_blue === other.#m_blue
			&& this.#m_alpha === other.#m_alpha;
	}

	toCss(): string {
		return `rgba(${this.#m_red}, ${this.#m_green}, ${this.#m_blue}, ${this.#m_alpha / 255})`;
	}

	toHex(): string {
		const hex = (value: number) => value.toString(16).padStart(2, "0");
		return `#${hex(this.#m_red)}${hex(this.#m_green)}` + `${hex(this.#m_blue)}`;
	}

	static #clamp(value: number): number {
		return Math.max(0, Math.min(255, value));
	}
}