import { CColor } from "./CColor.js";

/**
 * Identifies semantic color roles in a widget palette.
 */
export enum CPaletteColorRole {
		/**
	 * Window.
	 */
Window,
		/**
	 * Window text.
	 */
WindowText,
		/**
	 * Base.
	 */
Base,
		/**
	 * Text.
	 */
Text,
		/**
	 * Button.
	 */
Button,
		/**
	 * Button text.
	 */
ButtonText,
		/**
	 * Disabled text.
	 */
DisabledText,
        /**
     * Highlight.
     */
Highlight,
		/**
	 * Highlighted text.
	 */
HighlightedText,
		/**
	 * Hover.
	 */
Hover,
		/**
	 * Tool tip base.
	 */
ToolTipBase,
		/**
	 * Tool tip text.
	 */
ToolTipText,
		/**
	 * Link.
	 */
Link,
		/**
	 * Light.
	 */
Light,
		/**
	 * Mid.
	 */
Mid,
		/**
	 * Dark.
	 */
Dark,
/**
 * Placeholder text color
 */
PlaceholderText
}

/**
 * Stores colors used to render widgets for different semantic roles.
 */
export class CPalette {
	#m_colors = new Map<CPaletteColorRole, CColor>();

		/**
	 * Creates a new CPalette instance.
	 *
	 * @param pal Pal.
	 */
constructor(pal: CPalette | null = null) {
		if (pal === null) {
			this.#m_colors.set(CPaletteColorRole.Window, new CColor(224, 224, 224));
			this.#m_colors.set(CPaletteColorRole.WindowText, new CColor(0, 0, 0));
			this.#m_colors.set(CPaletteColorRole.Base, new CColor(255, 255, 255));
			this.#m_colors.set(CPaletteColorRole.Text, new CColor(0, 0, 0));
			this.#m_colors.set(CPaletteColorRole.Button, new CColor(240, 240, 240));
			this.#m_colors.set(CPaletteColorRole.ButtonText, new CColor(0, 0, 0));
        	this.#m_colors.set(CPaletteColorRole.DisabledText, new CColor(128, 128, 128));
			this.#m_colors.set(CPaletteColorRole.Highlight, new CColor(0, 120, 215));
			this.#m_colors.set(CPaletteColorRole.HighlightedText, new CColor(255, 255, 255));
			this.#m_colors.set(CPaletteColorRole.Hover, new CColor(224, 238, 249));
			this.#m_colors.set(CPaletteColorRole.ToolTipBase, new CColor(255, 255, 220));
			this.#m_colors.set(CPaletteColorRole.ToolTipText, new CColor(0, 0, 0));
			this.#m_colors.set(CPaletteColorRole.Link, new CColor(0, 0, 238));
			this.#m_colors.set(CPaletteColorRole.Light, new CColor(255, 255, 255));
			this.#m_colors.set(CPaletteColorRole.Mid, new CColor(160, 160, 160));
			this.#m_colors.set(CPaletteColorRole.Dark, new CColor(96, 96, 96));
			this.#m_colors.set(CPaletteColorRole.PlaceholderText, new CColor(160, 160, 160));
		}	else {
			this.#m_colors.set(CPaletteColorRole.Window, pal.color(CPaletteColorRole.Window));
			this.#m_colors.set(CPaletteColorRole.WindowText, pal.color(CPaletteColorRole.WindowText));
			this.#m_colors.set(CPaletteColorRole.Base, pal.color(CPaletteColorRole.Base));
			this.#m_colors.set(CPaletteColorRole.Text, pal.color(CPaletteColorRole.Text));
			this.#m_colors.set(CPaletteColorRole.Button, pal.color(CPaletteColorRole.Button));
			this.#m_colors.set(CPaletteColorRole.ButtonText, pal.color(CPaletteColorRole.ButtonText));
        	this.#m_colors.set(CPaletteColorRole.DisabledText, pal.color(CPaletteColorRole.DisabledText));
			this.#m_colors.set(CPaletteColorRole.Highlight, pal.color(CPaletteColorRole.Highlight));
			this.#m_colors.set(CPaletteColorRole.HighlightedText, pal.color(CPaletteColorRole.HighlightedText));
			this.#m_colors.set(CPaletteColorRole.Hover, pal.color(CPaletteColorRole.Hover));
			this.#m_colors.set(CPaletteColorRole.ToolTipBase, pal.color(CPaletteColorRole.ToolTipBase));
			this.#m_colors.set(CPaletteColorRole.ToolTipText, pal.color(CPaletteColorRole.ToolTipText));
			this.#m_colors.set(CPaletteColorRole.Link, pal.color(CPaletteColorRole.Link));
			this.#m_colors.set(CPaletteColorRole.Light, pal.color(CPaletteColorRole.Light));
			this.#m_colors.set(CPaletteColorRole.Mid, pal.color(CPaletteColorRole.Mid));
			this.#m_colors.set(CPaletteColorRole.Dark, pal.color(CPaletteColorRole.Dark));
			this.#m_colors.set(CPaletteColorRole.PlaceholderText, pal.color(CPaletteColorRole.PlaceholderText));
		}
	}

		/**
 * Reads the color assigned to a palette role. An unknown role throws.
 * @param role Palette role to look up.
 * @returns Independent copy of the assigned color.
 */
color(role: CPaletteColorRole): CColor {
		const color = this.#m_colors.get(role);

		if (color === undefined)
			throw new Error("Invalid palette color role.");

		return new CColor(color.red(), color.green(), color.blue(), color.alpha());
	}

		/**
	 * Assigns a color to the specified palette role.
	 *
	 * @param role Palette role whose color should be replaced.
	 * @param color Color.
	 */
setColor(role: CPaletteColorRole, color: CColor): void {
		this.#m_colors.set(role, color);
	}

		/**
 * Compares the assigned colors by role.
 * @param other Palette to compare.
 * @returns `true` if the corresponding role colors match.
 */
isEqual(other: CPalette): boolean {
		for (const [role, color] of this.#m_colors) {
			if (!color.equals(other.color(role)))
				return false;
		}
		return true;
	}
}