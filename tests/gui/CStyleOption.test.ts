import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CStyleOption, CStyleState } from "../../src/gui/CStyleOption.js";
import { CColor } from "../../src/gui/CColor.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CPalette } from "../../src/gui/CPalette.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CApplication } from "../../src/core/CApplication.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CFont } from "../../src/gui/CFont.js";

describe("CStyleOption", () => {
    beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has empty rect by default", () => {
		const option = new CStyleOption();

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(0);
		expect(option.rect.height()).toBe(0);
	});

	test("has no state by default", () => {
		const option = new CStyleOption();

		expect(option.state).toBe(CStyleState.None);
	});

	test("can combine states", () => {
		const state = CStyleState.Enabled |
			CStyleState.MouseOver |
			CStyleState.HasFocus;

		expect(state & CStyleState.Enabled).not.toBe(0);
		expect(state & CStyleState.MouseOver).not.toBe(0);
		expect(state & CStyleState.HasFocus).not.toBe(0);
		expect(state & CStyleState.Sunken).toBe(0);
	});

	test("copies rect", () => {
		const source = new CStyleOption();
		source.rect.setGeometry(10, 20, 100, 50);

		const copy = new CStyleOption(source);

		expect(copy.rect.equals(source.rect)).toBe(true);
		expect(copy.rect).not.toBe(source.rect);
	});

	test("copies state", () => {
		const source = new CStyleOption();
		source.state = CStyleState.Enabled | CStyleState.MouseOver;

		const copy = new CStyleOption(source);

		expect(copy.state).toBe(source.state);
	});

	test("copies palette", () => {
		const source = new CStyleOption();
		source.palette.setColor(
			CPaletteColorRole.Button,
			new CColor(10, 20, 30)
		);

		const copy = new CStyleOption(source);

		expect(copy.palette).not.toBe(source.palette);
		expect(copy.palette.color(CPaletteColorRole.Button).equals(
			new CColor(10, 20, 30)
		)).toBe(true);
	});

	test("copies font independently", () => {
		const source = new CStyleOption();
		source.font = new CFont("Arial", 18);

		const copy = new CStyleOption(source);
		copy.font.setPixelSize(24);

		expect(source.font.pixelSize()).toBe(18);
		expect(copy.font.pixelSize()).toBe(24);
	});

	test("copied rect is independent", () => {
		const source = new CStyleOption();
		source.rect.setGeometry(10, 20, 100, 50);

		const copy = new CStyleOption(source);
		copy.rect.setGeometry(1, 2, 3, 4);

		expect(source.rect.x()).toBe(10);
		expect(source.rect.y()).toBe(20);
		expect(source.rect.width()).toBe(100);
		expect(source.rect.height()).toBe(50);
	});

	test("copied palette is independent", () => {
		const source = new CStyleOption();
		source.palette.setColor(
			CPaletteColorRole.Button,
			new CColor(10, 20, 30)
		);

		const copy = new CStyleOption(source);
		copy.palette.setColor(
			CPaletteColorRole.Button,
			new CColor(40, 50, 60)
		);

		expect(source.palette.color(CPaletteColorRole.Button).equals(
			new CColor(10, 20, 30)
		)).toBe(true);
	});

	test("initializes rect from widget", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.rect.equals(widget.rect())).toBe(true);
	});

	test("initializes palette from widget", () => {
		const widget = new CWidget();
		widget.setPalette(new CPalette());

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.palette).not.toBe(widget.palette());
	});

	test("initializes font from widget", () => {
		const widget = new CWidget();
		widget.setFont(new CFont("Arial", 18));

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.font.toCss()).toBe("18px Arial");
	});

	test("sets enabled state for enabled widget", () => {
		const widget = new CWidget();

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("does not set enabled state for disabled widget", () => {
		const widget = new CWidget();
		widget.setEnabled(false);

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("sets focus state for focused widget", () => {
		const widget = new CWidget();
		widget.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget.setFocus();

		const option = new CStyleOption();
		option.initFrom(widget);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("clears previous state when initialized", () => {
		const widget = new CWidget();

		const option = new CStyleOption();
		option.state = CStyleState.Sunken | CStyleState.Selected;

		option.initFrom(widget);

		expect(option.state & CStyleState.Sunken).toBe(0);
		expect(option.state & CStyleState.Selected).toBe(0);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});
});
