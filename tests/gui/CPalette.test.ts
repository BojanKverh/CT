import { CCssPalette } from "../../src/gui/CCssPalette.js";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CColor } from "../../src/gui/CColor.js";
import {
	CPalette,
	CPaletteColorRole
} from "../../src/gui/CPalette.js";

describe("CPalette", () => {
	test("has default window color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.Window).equals(new CColor(224, 224, 224))).toBe(true);
	});

	test("has default window text color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.WindowText).equals(new CColor(0, 0, 0))).toBe(true);
	});

	test("has default base color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.Base).equals(new CColor(255, 255, 255))).toBe(true);
	});

	test("has default text color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.Text).equals(new CColor(0, 0, 0))).toBe(true);
	});

	test("has default button color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.Button).equals(new CColor(240, 240, 240))).toBe(true);
	});

	test("has default button text color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.ButtonText).equals(new CColor(0, 0, 0))).toBe(true);
	});

	test("has default highlight color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.Highlight).equals(new CColor(0, 120, 215))).toBe(true);
	});

	test("has default highlighted text color", () => {
		const palette = new CPalette();

		expect(palette.color(CPaletteColorRole.HighlightedText).equals(new CColor(255, 255, 255))).toBe(true);
	});

	test("sets color for role", () => {
		const palette = new CPalette();
		const color = new CColor(10, 20, 30);

		palette.setColor(CPaletteColorRole.Button, color);

		expect(palette.color(CPaletteColorRole.Button).equals(color)).toBe(true);
	});

	test("changing one role does not affect other roles", () => {
		const palette = new CPalette();

		palette.setColor(
			CPaletteColorRole.Button,
			new CColor(10, 20, 30)
		);

		expect(palette.color(CPaletteColorRole.Window).equals(new CColor(224, 224, 224))).toBe(true);
	});
});

describe("CCssPalette", () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    function fixture(values: Record<string, string> = {}, color = "rgb(12, 34, 56)") {
        const nativeColors: Record<string, readonly number[]> = {
            "red": [255, 0, 0, 255],
            "rgb(12, 34, 56)": [12, 34, 56, 255],
            "rgba(12, 34, 56, 0.5)": [12, 34, 56, 128],
            "hsl(120, 100%, 50%)": [0, 255, 0, 255],
            "transparent": [0, 0, 0, 0],
            "rgb(1, 2, 3)": [1, 2, 3, 255],
            "rgb(4, 5, 6)": [4, 5, 6, 255],
            "#010203": [1, 2, 3, 255], "#040506": [4, 5, 6, 255]
        };
        let fill = "#010203";
        const context = {
            get fillStyle(): string { return fill; },
            set fillStyle(value: string) { if (nativeColors[value]) fill = value; },
            clearRect: vi.fn(), fillRect: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(nativeColors[fill]!) }))
        };
        const getContext = vi.fn(() => context);
        const createElement = vi.fn(() => ({ width: 0, height: 0, getContext }));
        const getComputedStyle = vi.fn(() => ({
            color, getPropertyValue: (name: string) => values[name] ?? ""
        }));
        const element = { ownerDocument: { createElement, defaultView: { getComputedStyle } } } as unknown as Element;
        return { element, values, getComputedStyle, createElement, getContext };
    }

    test("extends CPalette and falls back to every default role", () => {
        const { element } = fixture(); const palette = new CCssPalette(element);
        expect(palette instanceof CPalette).toBe(true);
        expect(palette.isEqual(new CPalette())).toBe(true);
    });

    const roles: ReadonlyArray<readonly [CPaletteColorRole, string]> = [
        [CPaletteColorRole.Window, "window"], [CPaletteColorRole.WindowText, "window-text"],
        [CPaletteColorRole.Base, "base"], [CPaletteColorRole.Text, "text"],
        [CPaletteColorRole.Button, "button"], [CPaletteColorRole.ButtonText, "button-text"],
        [CPaletteColorRole.DisabledText, "disabled-text"], [CPaletteColorRole.Highlight, "highlight"],
        [CPaletteColorRole.HighlightedText, "highlighted-text"], [CPaletteColorRole.Hover, "hover"],
        [CPaletteColorRole.ToolTipBase, "tool-tip-base"], [CPaletteColorRole.ToolTipText, "tool-tip-text"],
        [CPaletteColorRole.Link, "link"], [CPaletteColorRole.Light, "light"],
        [CPaletteColorRole.Mid, "mid"], [CPaletteColorRole.Dark, "dark"],
        [CPaletteColorRole.PlaceholderText, "placeholder-text"]
    ];
    for (const [role, name] of roles) {
        test(`maps --ct-${name} to its role without affecting other roles`, () => {
            const { element } = fixture({ [`--ct-${name}`]: "#123456" });
            const palette = new CCssPalette(element), defaults = new CPalette();
            expect(palette.color(role).equals(new CColor(18, 52, 86))).toBe(true);
            for (const [other] of roles) if (other !== role)
                expect(palette.color(other).equals(defaults.color(other))).toBe(true);
        });
    }

    for (const [css, rgba] of [
        ["  #AbC  ", [170, 187, 204, 255]], ["#1234", [17, 34, 51, 68]],
        ["#12345678", [18, 52, 86, 120]], ["#ff000000", [255, 0, 0, 0]],
        ["red", [255, 0, 0, 255]], ["rgb(12, 34, 56)", [12, 34, 56, 255]],
        ["rgba(12, 34, 56, 0.5)", [12, 34, 56, 128]],
        ["hsl(120, 100%, 50%)", [0, 255, 0, 255]], ["transparent", [0, 0, 0, 0]],
        ["currentColor", [12, 34, 56, 255]],
        ["rgb(1, 2, 3)", [1, 2, 3, 255]], ["rgb(4, 5, 6)", [4, 5, 6, 255]]
    ] as const) {
        test(`reads ${css}`, () => {
            const { element } = fixture({ "--ct-text": css });
            expect(new CCssPalette(element).color(CPaletteColorRole.Text)
                .equals(new CColor(rgba[0], rgba[1], rgba[2], rgba[3]))).toBe(true);
        });
    }

    for (const css of ["", "   ", "#12", "#zzzzzz", "not-a-color", "inherit", "initial", "unset", "revert", "revert-layer"]) {
        test(`defaults for invalid or missing value ${JSON.stringify(css)}`, () => {
            const { element } = fixture({ "--ct-highlight": css });
            expect(new CCssPalette(element).color(CPaletteColorRole.Highlight)
                .equals(new CPalette().color(CPaletteColorRole.Highlight))).toBe(true);
        });
    }

    test("reload rereads CSS and resets removed or invalid values", () => {
        const { element, values } = fixture({ "--ct-text": "#123456", "--ct-base": "#654321" });
        const palette = new CCssPalette(element);
        values["--ct-text"] = "#abcdef"; delete values["--ct-base"]; palette.reload();
        expect(palette.color(CPaletteColorRole.Text).toHex()).toBe("#abcdef");
        expect(palette.color(CPaletteColorRole.Base).toHex()).toBe("#ffffff");
        values["--ct-text"] = "broken"; palette.reload();
        expect(palette.color(CPaletteColorRole.Text).toHex()).toBe("#000000");
    });
    test("color reads are snapshots and do not query CSS again", () => {
        const { element, values, getComputedStyle, createElement } = fixture({ "--ct-text": "#123456" });
        const palette = new CCssPalette(element); values["--ct-text"] = "#ffffff";
        const color = palette.color(CPaletteColorRole.Text); color.setAlpha(0);
        expect(palette.color(CPaletteColorRole.Text).alpha()).toBe(255);
        expect(palette.color(CPaletteColorRole.Text).toHex()).toBe("#123456");
        expect(getComputedStyle).toHaveBeenCalledTimes(1);
        expect(createElement).toHaveBeenCalledTimes(0);
    });
    test("reload resets manual overrides and CPalette copies retain CSS colors", () => {
        const { element } = fixture({ "--ct-text": "#123456" });
        const palette = new CCssPalette(element); const copy = new CPalette(palette);
        palette.setColor(CPaletteColorRole.Text, new CColor(1, 2, 3)); palette.reload();
        expect(palette.color(CPaletteColorRole.Text).toHex()).toBe("#123456");
        expect(copy.isEqual(palette)).toBe(true);
    });
    test("uses one temporary decoder per reload and does not mutate the source element", () => {
        const { element, createElement, getContext } = fixture({ "--ct-text": "red", "--ct-link": "transparent" });
        new CCssPalette(element);
        expect(createElement).toHaveBeenCalledTimes(1); expect(getContext).toHaveBeenCalledTimes(1);
        expect(Object.keys(element)).toEqual(["ownerDocument"]);
    });
    test("defaults to the first canvas and falls back to the document root", () => {
        const a = fixture({ "--ct-text": "#123456" }), b = fixture({ "--ct-text": "#abcdef" });
        vi.stubGlobal("document", { querySelector: () => a.element, documentElement: b.element });
        expect(new CCssPalette().color(CPaletteColorRole.Text).toHex()).toBe("#123456");
        vi.stubGlobal("document", { querySelector: () => null, documentElement: b.element });
        expect(new CCssPalette().color(CPaletteColorRole.Text).toHex()).toBe("#abcdef");
    });
    test("works without document and uses defaults", () => {
        vi.stubGlobal("document", undefined);
        expect(new CCssPalette().isEqual(new CPalette())).toBe(true);
    });
    test("HEX works without a canvas decoder; unsupported native colors use defaults", () => {
        const { element, getContext } = fixture({ "--ct-text": "red", "--ct-base": "#123456" });
        getContext.mockReturnValue(null as unknown as ReturnType<typeof getContext>);
        const palette = new CCssPalette(element);
        expect(palette.color(CPaletteColorRole.Text).toHex()).toBe("#000000");
        expect(palette.color(CPaletteColorRole.Base).toHex()).toBe("#123456");
    });
});
