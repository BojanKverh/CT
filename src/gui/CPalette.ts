import { CColor } from "./CColor.js";

export enum CPaletteColorRole {
	Window,
	WindowText,
	Base,
	Text,
	Button,
	ButtonText,
	DisabledText,
    Highlight,
	HighlightedText,
	Hover
}

export class CPalette {
	#m_colors = new Map<CPaletteColorRole, CColor>();

	constructor() {
		this.#m_colors.set(CPaletteColorRole.Window, new CColor(240, 240, 240));
		this.#m_colors.set(CPaletteColorRole.WindowText, new CColor(0, 0, 0));
		this.#m_colors.set(CPaletteColorRole.Base, new CColor(255, 255, 255));
		this.#m_colors.set(CPaletteColorRole.Text, new CColor(0, 0, 0));
		this.#m_colors.set(CPaletteColorRole.Button, new CColor(240, 240, 240));
		this.#m_colors.set(CPaletteColorRole.ButtonText, new CColor(0, 0, 0));
        this.#m_colors.set(CPaletteColorRole.DisabledText, new CColor(128, 128, 128));
		this.#m_colors.set(CPaletteColorRole.Highlight, new CColor(0, 120, 215));
		this.#m_colors.set(CPaletteColorRole.HighlightedText, new CColor(255, 255, 255));
		this.#m_colors.set(CPaletteColorRole.Hover, new CColor(255, 128, 0));
	}

	color(role: CPaletteColorRole): CColor {
		const color = this.#m_colors.get(role);

		if (color === undefined)
			throw new Error("Invalid palette color role.");

		return color;
	}

	setColor(role: CPaletteColorRole, color: CColor): void {
		this.#m_colors.set(role, color);
	}
}