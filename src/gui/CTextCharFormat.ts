/** @module GUI/CTextCharFormat */
/**
 * Defines the supported font weights.
 */
export type CFontWeight = "normal" | "bold";

/**
 * Describes character-level formatting in a rich-text document.
 */
export class CTextCharFormat {
	#m_fontWeight: CFontWeight = "normal";
	#m_italic = false;
	#m_foreground: string | null = null;
	#m_fontFamily: string | null = null;
	#m_fontSize: number | null = null;
	#m_underline = false;
	#m_anchorHref: string | null = null;

    /**
    * Copies character formatting from other, or starts with normal weight and no color, family, size or hyperlink override.
    */
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

    /**
    * Creates an independent copy of this object.
    *
    */
    clone(): CTextCharFormat {
		return new CTextCharFormat(this);
	}

    /**
    * Normal or bold character weight; newly constructed formats use normal.
    */
    fontWeight(): CFontWeight {
		return this.#m_fontWeight;
	}

    /**
    * Chooses normal or bold character weight.
    */
    setFontWeight(weight: CFontWeight): void {
		this.#m_fontWeight = weight;
	}

    /**
    * Whether character weight is bold; equivalent to fontWeight() === "bold".
    */
    fontBold(): boolean {
		return this.#m_fontWeight === "bold";
	}

    /**
    * Sets character weight to bold when true, otherwise normal.
    */
    setFontBold(bold: boolean): void {
		this.#m_fontWeight = bold ? "bold" : "normal";
	}

    /**
    * Whether characters use italic formatting.
    * The initial value is `false`.
    */
    fontItalic(): boolean {
		return this.#m_italic;
	}

    /**
    * Controls italic styling for this character format.
    */
    setFontItalic(italic: boolean): void {
		this.#m_italic = italic;
	}

    /**
    * Explicit CSS text color, or null when the surrounding text color should be used.
    */
    foreground(): string | null {
		return this.#m_foreground;
	}

    /**
    * Assigns a character foreground color. Null clears the override.
    */
    setForeground(color: string | null): void {
		this.#m_foreground = color;
	}

    /**
    * Explicit family override for character formatting.
    * The initial value is `null`.
    */
    fontFamily(): string | null {
		return this.#m_fontFamily;
	}

    /**
    * Assigns a character font-family override. Null restores the surrounding font family.
    */
    setFontFamily(family: string | null): void {
		this.#m_fontFamily = family;
	}

    /**
    * Explicit pixel-size override for character formatting.
    * The initial value is `null`.
    */
    fontSize(): number | null {
		return this.#m_fontSize;
	}

    /**
    * Assigns a positive pixel-size override. Null clears it; non-positive sizes throw RangeError.
    */
    setFontSize(size: number | null): void {
		if (size !== null && size <= 0)
			throw new RangeError("Font size must be greater than zero.");

		this.#m_fontSize = size;
	}

    /**
    * Whether characters use underline formatting.
    * The initial value is `false`.
    */
    fontUnderline(): boolean {
		return this.#m_underline;
	}

    /**
    * Controls underline decoration for characters in this format.
    */
    setFontUnderline(underline: boolean): void {
		this.#m_underline = underline;
	}

    /**
    * Hyperlink destination attached to this character run, or null when it is not a link.
    */
    anchorHref(): string | null {
		return this.#m_anchorHref;
	}

    /**
    * Associates characters with a hyperlink target or clears the target with null.
    */
    setAnchorHref(href: string | null): void {
		this.#m_anchorHref = href;
	}

    /**
    * Returns whether this object is equal to another object.
    *
    * @param other Other.
    *
    */
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
