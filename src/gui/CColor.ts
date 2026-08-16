export class CColor {
	#m_red: number;
	#m_green: number;
	#m_blue: number;
	#m_alpha: number;

	constructor(red: number, green: number, blue: number, alpha = 255) {
		this.#m_red = CColor.#clamp(red);
		this.#m_green = CColor.#clamp(green);
		this.#m_blue = CColor.#clamp(blue);
		this.#m_alpha = CColor.#clamp(alpha);
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

	static #clamp(value: number): number {
		return Math.max(0, Math.min(255, value));
	}
}