/** Font style used by a canvas font. */
export enum CFontStyle {
	Normal = "normal",
	Italic = "italic",
	Oblique = "oblique"
}

/** Common CSS font weights. */
export enum CFontWeight {
	Thin = 100,
	ExtraLight = 200,
	Light = 300,
	Normal = 400,
	Medium = 500,
	DemiBold = 600,
	Bold = 700,
	ExtraBold = 800,
	Black = 900
}

/** Font width variant used by a canvas font. */
export enum CFontStretch {
	UltraCondensed = "ultra-condensed",
	ExtraCondensed = "extra-condensed",
	Condensed = "condensed",
	SemiCondensed = "semi-condensed",
	Normal = "normal",
	SemiExpanded = "semi-expanded",
	Expanded = "expanded",
	ExtraExpanded = "extra-expanded",
	UltraExpanded = "ultra-expanded"
}

/** Font capitalization variant supported by the canvas font shorthand. */
export enum CFontCapitalization {
	MixedCase = "normal",
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

	constructor();
	constructor(other: CFont);
	constructor(
		family: string,
		pixelSize?: number,
		weight?: number,
		italic?: boolean
	);
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

	family(): string {
		return this.#m_family;
	}

	setFamily(family: string): void {
		const trimmed = family.trim();
		if (trimmed.length > 0)
			this.#m_family = trimmed;
	}

	pixelSize(): number {
		return this.#m_pixelSize;
	}

	setPixelSize(pixelSize: number): void {
		if (Number.isFinite(pixelSize) && pixelSize > 0)
			this.#m_pixelSize = pixelSize;
	}

	weight(): number {
		return this.#m_weight;
	}

	setWeight(weight: number): void {
		if (Number.isFinite(weight))
			this.#m_weight = Math.max(1, Math.min(1000, Math.round(weight)));
	}

	isBold(): boolean {
		return this.#m_weight >= CFontWeight.Bold;
	}

	setBold(bold: boolean): void {
		this.#m_weight = bold ? CFontWeight.Bold : CFontWeight.Normal;
	}

	style(): CFontStyle {
		return this.#m_style;
	}

	setStyle(style: CFontStyle): void {
		this.#m_style = style;
	}

	isItalic(): boolean {
		return this.#m_style === CFontStyle.Italic;
	}

	setItalic(italic: boolean): void {
		this.#m_style = italic ? CFontStyle.Italic : CFontStyle.Normal;
	}

	stretch(): CFontStretch {
		return this.#m_stretch;
	}

	setStretch(stretch: CFontStretch): void {
		this.#m_stretch = stretch;
	}

	capitalization(): CFontCapitalization {
		return this.#m_capitalization;
	}

	setCapitalization(capitalization: CFontCapitalization): void {
		this.#m_capitalization = capitalization;
	}

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
