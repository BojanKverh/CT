export type CFontWeight = "normal" | "bold";

export class CTextCharFormat {
	#m_fontWeight: CFontWeight = "normal";
	#m_italic = false;
	#m_foreground: string | null = null;
	#m_fontFamily: string | null = null;
	#m_fontSize: number | null = null;
	#m_underline = false;
	#m_anchorHref: string | null = null;

	constructor(other: CTextCharFormat | null = null) {
		if (other === null)
			return;

		this.#m_fontWeight = other.fontWeight();
		this.#m_italic = other.fontItalic();
		this.#m_foreground = other.foreground();
		this.#m_fontFamily = other.fontFamily();
		this.#m_fontSize = other.fontSize();
		this.#m_underline = other.fontUnderline();
		this.#m_anchorHref = other.anchorHref();
	}

	clone(): CTextCharFormat {
		return new CTextCharFormat(this);
	}

	fontWeight(): CFontWeight {
		return this.#m_fontWeight;
	}

	setFontWeight(weight: CFontWeight): void {
		this.#m_fontWeight = weight;
	}

	fontBold(): boolean {
		return this.#m_fontWeight === "bold";
	}

	setFontBold(bold: boolean): void {
		this.#m_fontWeight = bold ? "bold" : "normal";
	}

	fontItalic(): boolean {
		return this.#m_italic;
	}

	setFontItalic(italic: boolean): void {
		this.#m_italic = italic;
	}

	foreground(): string | null {
		return this.#m_foreground;
	}

	setForeground(color: string | null): void {
		this.#m_foreground = color;
	}

	fontFamily(): string | null {
		return this.#m_fontFamily;
	}

	setFontFamily(family: string | null): void {
		this.#m_fontFamily = family;
	}

	fontSize(): number | null {
		return this.#m_fontSize;
	}

	setFontSize(size: number | null): void {
		if (size !== null && size <= 0)
			throw new RangeError("Font size must be greater than zero.");

		this.#m_fontSize = size;
	}

	fontUnderline(): boolean {
		return this.#m_underline;
	}

	setFontUnderline(underline: boolean): void {
		this.#m_underline = underline;
	}

	anchorHref(): string | null {
		return this.#m_anchorHref;
	}

	setAnchorHref(href: string | null): void {
		this.#m_anchorHref = href;
	}

	equals(other: CTextCharFormat): boolean {
		return this.#m_fontWeight === other.#m_fontWeight
			&& this.#m_italic === other.#m_italic
			&& this.#m_foreground === other.#m_foreground
			&& this.#m_fontFamily === other.#m_fontFamily
			&& this.#m_fontSize === other.#m_fontSize
			&& this.#m_underline === other.#m_underline
			&& this.#m_anchorHref === other.#m_anchorHref;
	}
}
