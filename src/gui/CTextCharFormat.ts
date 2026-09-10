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
	 * Creates a new CTextCharFormat instance.
	 *
	 * @param other Other.
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
	 * @returns The resulting value.
	 */
clone(): CTextCharFormat {
		return new CTextCharFormat(this);
	}

		/**
	 * Returns the font weight setting.
	 *
	 * @returns The resulting value.
	 */
fontWeight(): CFontWeight {
		return this.#m_fontWeight;
	}

		/**
	 * Sets the font weight.
	 *
	 * @param weight Weight.
	 */
setFontWeight(weight: CFontWeight): void {
		this.#m_fontWeight = weight;
	}

		/**
	 * Returns the font bold setting.
	 *
	 * @returns The resulting value.
	 */
fontBold(): boolean {
		return this.#m_fontWeight === "bold";
	}

		/**
	 * Sets the font bold.
	 *
	 * @param bold Bold.
	 */
setFontBold(bold: boolean): void {
		this.#m_fontWeight = bold ? "bold" : "normal";
	}

		/**
	 * Returns the font italic setting.
	 *
	 * @returns The resulting value.
	 */
fontItalic(): boolean {
		return this.#m_italic;
	}

		/**
	 * Sets the font italic.
	 *
	 * @param italic Italic.
	 */
setFontItalic(italic: boolean): void {
		this.#m_italic = italic;
	}

		/**
	 * Returns or updates the foreground value.
	 *
	 * @returns The resulting value.
	 */
foreground(): string | null {
		return this.#m_foreground;
	}

		/**
	 * Sets the foreground.
	 *
	 * @param color Color.
	 */
setForeground(color: string | null): void {
		this.#m_foreground = color;
	}

		/**
	 * Returns the font family setting.
	 *
	 * @returns The resulting value.
	 */
fontFamily(): string | null {
		return this.#m_fontFamily;
	}

		/**
	 * Sets the font family.
	 *
	 * @param family Family.
	 */
setFontFamily(family: string | null): void {
		this.#m_fontFamily = family;
	}

		/**
	 * Returns the font size setting.
	 *
	 * @returns The resulting value.
	 */
fontSize(): number | null {
		return this.#m_fontSize;
	}

		/**
	 * Sets the font size.
	 *
	 * @param size Size.
	 */
setFontSize(size: number | null): void {
		if (size !== null && size <= 0)
			throw new RangeError("Font size must be greater than zero.");

		this.#m_fontSize = size;
	}

		/**
	 * Returns the font underline setting.
	 *
	 * @returns The resulting value.
	 */
fontUnderline(): boolean {
		return this.#m_underline;
	}

		/**
	 * Sets the font underline.
	 *
	 * @param underline Underline.
	 */
setFontUnderline(underline: boolean): void {
		this.#m_underline = underline;
	}

		/**
	 * Returns or updates the anchor href value.
	 *
	 * @returns The resulting value.
	 */
anchorHref(): string | null {
		return this.#m_anchorHref;
	}

		/**
	 * Sets the anchor href.
	 *
	 * @param href Href.
	 */
setAnchorHref(href: string | null): void {
		this.#m_anchorHref = href;
	}

		/**
	 * Returns whether this object is equal to another object.
	 *
	 * @param other Other.
	 *
	 * @returns The resulting value.
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
