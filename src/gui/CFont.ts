/** @module GUI/CFont */
/** Font style used by a canvas font. */
export enum CFontStyle {
    /**
    * Use upright glyphs without italic or oblique styling.
    */
    Normal = "normal",
    /**
    * Request the italic face from the selected font family.
    */
    Italic = "italic",
    /**
    * Request a slanted face from the selected font family.
    */
    Oblique = "oblique"
}

/** Common CSS font weights. */
export enum CFontWeight {
    /**
    * CSS numeric weight 100 requested from the selected font family.
    */
    Thin = 100,
    /**
    * CSS numeric weight 200 requested from the selected font family.
    */
    ExtraLight = 200,
    /**
    * CSS numeric weight 300 requested from the selected font family.
    */
    Light = 300,
    /**
    * CSS numeric weight 400 requested from the selected font family.
    */
    Normal = 400,
    /**
    * CSS numeric weight 500 requested from the selected font family.
    */
    Medium = 500,
    /**
    * CSS numeric weight 600 requested from the selected font family.
    */
    DemiBold = 600,
    /**
    * CSS numeric weight 700 requested from the selected font family.
    */
    Bold = 700,
    /**
    * CSS numeric weight 800 requested from the selected font family.
    */
    ExtraBold = 800,
    /**
    * CSS numeric weight 900 requested from the selected font family.
    */
    Black = 900
}

/** Font width variant used by a canvas font. */
export enum CFontStretch {
    /**
    * Request the CSS ultra-condensed width variant from the font family.
    */
    UltraCondensed = "ultra-condensed",
    /**
    * Request the CSS extra-condensed width variant from the font family.
    */
    ExtraCondensed = "extra-condensed",
    /**
    * Request the CSS condensed width variant from the font family.
    */
    Condensed = "condensed",
    /**
    * Request the CSS semi-condensed width variant from the font family.
    */
    SemiCondensed = "semi-condensed",
    /**
    * Request the CSS normal width variant from the font family.
    */
    Normal = "normal",
    /**
    * Request the CSS semi-expanded width variant from the font family.
    */
    SemiExpanded = "semi-expanded",
    /**
    * Request the CSS expanded width variant from the font family.
    */
    Expanded = "expanded",
    /**
    * Request the CSS extra-expanded width variant from the font family.
    */
    ExtraExpanded = "extra-expanded",
    /**
    * Request the CSS ultra-expanded width variant from the font family.
    */
    UltraExpanded = "ultra-expanded"
}

/** Font capitalization variant supported by the canvas font shorthand. */
export enum CFontCapitalization {
    /**
    * Preserve the normal upper- and lowercase glyph forms.
    */
    MixedCase = "normal",
    /**
    * Request small-capital glyphs for lowercase characters.
    */
    SmallCaps = "small-caps"
}

/**
 * Describes a font independently of a paint device.
 *
 * The object can be converted to the CSS font shorthand accepted by
 * CanvasRenderingContext2D.font.
 */
export class CFont {
	#m_family = "sans-serif";
	#m_pixelSize = 14;
	#m_weight: number = CFontWeight.Normal;
	#m_style = CFontStyle.Normal;
	#m_stretch = CFontStretch.Normal;
	#m_capitalization = CFontCapitalization.MixedCase;

    /**
    * Copies another font or configures CSS font properties. The default is 14-pixel normal sans-serif.
    */
    constructor();
    /**
    * Copies another font or configures CSS font properties. The default is 14-pixel normal sans-serif.
    * @param other Value object whose settings are copied.
    */
    constructor(other: CFont);
    /**
    * Copies another font or configures CSS font properties. The default is 14-pixel normal sans-serif.
    * @param family CSS font family with optional fallback families.
    * @param pixelSize Logical font size in pixels.
    * @param weight CSS numeric font weight.
    * @param italic Whether the configured font uses italic styling.
    */
    constructor(
		family: string,
		pixelSize?: number,
		weight?: number,
		italic?: boolean
	);
    /**
    * Copies another font or configures CSS font properties. The default is 14-pixel normal sans-serif.
    * @param familyOrFont Input used to configure CFont. Omit to use `"sans-serif"`.
    * @param pixelSize Logical font size in pixels. Omit to use `14`.
    * @param weight CSS numeric font weight. Omit to use `CFontWeight.Normal`.
    * @param italic Whether the configured font uses italic styling. Omit to use `false`.
    */
    constructor(
		familyOrFont: string | CFont = "sans-serif",
		pixelSize = 14,
		weight: number = CFontWeight.Normal,
		italic = false
	) {
		if (familyOrFont instanceof CFont) {
			this.#m_family = familyOrFont.family();
			this.#m_pixelSize = familyOrFont.pixelSize();
			this.#m_weight = familyOrFont.weight();
			this.#m_style = familyOrFont.style();
			this.#m_stretch = familyOrFont.stretch();
			this.#m_capitalization = familyOrFont.capitalization();
			return;
		}

		this.setFamily(familyOrFont);
		this.setPixelSize(pixelSize);
		this.setWeight(weight);
		this.setItalic(italic);
	}

    /**
    * Returns the CSS font-family value, including any fallback families.
    */
    family(): string {
		return this.#m_family;
	}

    /**
    * Changes the font-family value used when converting this font to CSS.
    */
    setFamily(family: string): void {
		const trimmed = family.trim();
		if (trimmed.length > 0)
			this.#m_family = trimmed;
	}

    /**
    * Returns the logical font size in pixels.
    */
    pixelSize(): number {
		return this.#m_pixelSize;
	}

    /**
    * Changes the logical font size in pixels.
    */
    setPixelSize(pixelSize: number): void {
		if (Number.isFinite(pixelSize) && pixelSize > 0)
			this.#m_pixelSize = pixelSize;
	}

    /**
    * Returns the CSS font-weight value.
    */
    weight(): number {
		return this.#m_weight;
	}

    /**
    * Changes font weight used by CSS text drawing.
    */
    setWeight(weight: number): void {
		if (Number.isFinite(weight))
			this.#m_weight = Math.max(1, Math.min(1000, Math.round(weight)));
	}

    /**
    * Reports whether the font weight meets the bold threshold.
    */
    isBold(): boolean {
		return this.#m_weight >= CFontWeight.Bold;
	}

    /**
    * Chooses a normal or bold font weight.
    */
    setBold(bold: boolean): void {
		this.#m_weight = bold ? CFontWeight.Bold : CFontWeight.Normal;
	}

    /**
    * Returns the CSS font-style value.
    */
    style(): CFontStyle {
		return this.#m_style;
	}

    /**
    * Changes normal, italic or oblique styling.
    */
    setStyle(style: CFontStyle): void {
		this.#m_style = style;
	}

    /**
    * Reports whether italic font styling is configured.
    */
    isItalic(): boolean {
		return this.#m_style === CFontStyle.Italic;
	}

    /**
    * Switches between normal and italic styling.
    */
    setItalic(italic: boolean): void {
		this.#m_style = italic ? CFontStyle.Italic : CFontStyle.Normal;
	}

    /**
    * Returns the CSS font-stretch value.
    */
    stretch(): CFontStretch {
		return this.#m_stretch;
	}

    /**
    * Changes the CSS stretch value used when painting text.
    */
    setStretch(stretch: CFontStretch): void {
		this.#m_stretch = stretch;
	}

    /**
    * Returns the configured text capitalization policy.
    */
    capitalization(): CFontCapitalization {
		return this.#m_capitalization;
	}

    /**
    * Changes the capitalization policy retained by this font.
    */
    setCapitalization(capitalization: CFontCapitalization): void {
		this.#m_capitalization = capitalization;
	}

    /**
    * Compares all retained font settings with another font.
    */
    isEqual(other: CFont): boolean {
		return this.#m_family === other.#m_family &&
			this.#m_pixelSize === other.#m_pixelSize &&
			this.#m_weight === other.#m_weight &&
			this.#m_style === other.#m_style &&
			this.#m_stretch === other.#m_stretch &&
			this.#m_capitalization === other.#m_capitalization;
	}

    /** Returns a CSS font shorthand suitable for a canvas 2D context. */
    toCss(): string {
		const parts: string[] = [];

		if (this.#m_style !== CFontStyle.Normal)
			parts.push(this.#m_style);
		if (this.#m_capitalization !== CFontCapitalization.MixedCase)
			parts.push(this.#m_capitalization);
		if (this.#m_weight !== CFontWeight.Normal)
			parts.push(String(this.#m_weight));
		if (this.#m_stretch !== CFontStretch.Normal)
			parts.push(this.#m_stretch);

		parts.push(`${this.#m_pixelSize}px`, this.#m_family);
		return parts.join(" ");
	}

    /** Creates a font from the common CSS shorthand returned by a canvas. */
    static fromCss(css: string): CFont {
		const tokens = css.trim().split(/\s+/);
		const sizeIndex = tokens.findIndex(token => /^\d+(?:\.\d+)?px$/.test(token));

		if (sizeIndex < 0)
			return new CFont();

		const size = Number.parseFloat(tokens[sizeIndex] ?? "14");
		const family = tokens.slice(sizeIndex + 1).join(" ") || "sans-serif";
		const font = new CFont(family, size);

		for (const token of tokens.slice(0, sizeIndex)) {
			if (token === CFontStyle.Italic || token === CFontStyle.Oblique)
				font.setStyle(token);
			else if (token === CFontCapitalization.SmallCaps)
				font.setCapitalization(CFontCapitalization.SmallCaps);
			else if ((Object.values(CFontStretch) as string[]).includes(token))
				font.setStretch(token as CFontStretch);
			else if (token === "bold")
				font.setBold(true);
			else if (/^\d{1,4}$/.test(token))
				font.setWeight(Number(token));
		}

		return font;
	}
}
