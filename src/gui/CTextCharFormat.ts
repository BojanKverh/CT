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
 * Copies the typography, foreground and link attributes.
 * @returns Independent copy of this format.
 */
clone(): CTextCharFormat {
		return new CTextCharFormat(this);
	}

		/**
 * Reads the stored font weight.
 * @returns Current font weight.
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
 * Tests this format's explicit bold setting.
 * @returns `true` if the weight is the string `bold`.
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
 * Reads the italic flag.
 * @returns `true` if italic styling is enabled.
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
 * Reads the foreground override.
 * @returns Color string, or `null` to inherit the surrounding foreground.
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
 * Reads the font family override.
 * @returns Family name, or `null` if no override is set.
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
 * Reads the font size override.
 * @returns Font size in pixels, or `null` if no override is set.
 */
fontSize(): number | null {
		return this.#m_fontSize;
	}

		/**
	 * Sets the font size.
	 *
	 * @param size Font size in pixels, or null to clear the explicit size.
	 */
setFontSize(size: number | null): void {
		if (size !== null && size <= 0)
			throw new RangeError("Font size must be greater than zero.");

		this.#m_fontSize = size;
	}

		/**
 * Reads the underline flag.
 * @returns `true` if underline styling is enabled.
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
 * Reads the anchor target attached to the format.
 * @returns Link target string, or `null` for a non-link format.
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
 * Compares all stored typography, foreground and anchor attributes.
 * @param other Format to compare.
 * @returns `true` if all attributes match.
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
