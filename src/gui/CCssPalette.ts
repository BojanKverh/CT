/** @module GUI/CCssPalette */
import { CColor } from "./CColor.js";
import { CPalette, CPaletteColorRole } from "./CPalette.js";

/** CSS custom properties corresponding to all semantic palette roles. */
const properties: ReadonlyArray<readonly [CPaletteColorRole, string]> = [
    [CPaletteColorRole.Window, "--ct-window"],
    [CPaletteColorRole.WindowText, "--ct-window-text"],
    [CPaletteColorRole.Base, "--ct-base"],
    [CPaletteColorRole.Text, "--ct-text"],
    [CPaletteColorRole.Button, "--ct-button"],
    [CPaletteColorRole.ButtonText, "--ct-button-text"],
    [CPaletteColorRole.DisabledText, "--ct-disabled-text"],
    [CPaletteColorRole.Highlight, "--ct-highlight"],
    [CPaletteColorRole.HighlightedText, "--ct-highlighted-text"],
    [CPaletteColorRole.Hover, "--ct-hover"],
    [CPaletteColorRole.ToolTipBase, "--ct-tool-tip-base"],
    [CPaletteColorRole.ToolTipText, "--ct-tool-tip-text"],
    [CPaletteColorRole.Link, "--ct-link"],
    [CPaletteColorRole.Light, "--ct-light"],
    [CPaletteColorRole.Mid, "--ct-mid"],
    [CPaletteColorRole.Dark, "--ct-dark"],
    [CPaletteColorRole.PlaceholderText, "--ct-placeholder-text"]
];

/** A snapshot of CSS theme colors with CPalette defaults for unspecified roles.
 * Pass the application canvas to read its scoped and inherited custom properties.
 * Without an element, uses the first canvas or, if absent, the document root.
 * No DOM is required: in a non-browser environment the palette uses defaults.
 * reload() rereads CSS; reapply this palette to an application/widget afterwards
 * when its setPalette() stores a copy. No CSS queries occur during painting.
 */
export class CCssPalette extends CPalette {
    #m_element: Element | null;

    /**
    * Reads the supported --ct-* CSS custom properties from the supplied element.
    * @param element Input used to configure CCssPalette. Omit to use `null`.
    */
    constructor(element: Element | null = null) {
        super();
        this.#m_element = element;
        this.reload();
    }

    /** Rereads all roles. Removed/invalid CSS values restore CPalette defaults.
    * Manual setColor() overrides are also replaced by this theme snapshot.
    */
    reload(): void {
        const element = this.#m_element ?? (typeof document === "undefined" ? null
            : document.querySelector("canvas") ?? document.documentElement);
        const view = element?.ownerDocument.defaultView;
        const style = element && view ? view.getComputedStyle(element) : null;
        const defaults = new CPalette();
        // Create the decoder lazily: HEX-only themes need no canvas context.
        let decoder: CanvasRenderingContext2D | null | undefined;
        const context = (): CanvasRenderingContext2D | null => {
            if (decoder === undefined) {
                const canvas = element?.ownerDocument.createElement("canvas");
                if (canvas) { canvas.width = 1; canvas.height = 1; }
                decoder = canvas?.getContext("2d") ?? null;
            }
            return decoder;
        };
        for (const [role, property] of properties) {
            let value = style?.getPropertyValue(property).trim() ?? "";
            if (value.toLowerCase() === "currentcolor") value = style?.color ?? "";
            const color = CCssPalette.#parse(value, context);
            this.setColor(role, color ?? defaults.color(role));
        }
    }

    static #parse(value: string, context: () => CanvasRenderingContext2D | null): CColor | null {
        if (value === "") return null;
        const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value);
        if (hex) {
            let digits = hex[1]!;
            if (digits.length <= 4) digits = [...digits].map(char => char + char).join("");
            return new CColor(parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16),
                parseInt(digits.slice(4, 6), 16), digits.length === 8 ? parseInt(digits.slice(6, 8), 16) : 255);
        }
        // These keywords need a CSS cascade, not a standalone Canvas color.
        if (/^(inherit|initial|unset|revert|revert-layer)$/i.test(value)) return null;
        const ctx = context();
        if (!ctx) return null;
        // Invalid fillStyle assignments are ignored. Two different sentinels
        // distinguish invalid values from a valid color equal to either sentinel.
        ctx.fillStyle = "#010203";
        ctx.fillStyle = value;
        const first = ctx.fillStyle;
        ctx.fillStyle = "#040506";
        ctx.fillStyle = value;
        if (ctx.fillStyle !== first) return null;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        const rgba = ctx.getImageData(0, 0, 1, 1).data;
        return new CColor(rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!);
    }
}
