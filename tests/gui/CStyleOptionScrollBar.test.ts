import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CScrollBar } from "../../src/widgets/CScrollBar.js";
import { CStyleOptionScrollBar } from
	"../../src/gui/CStyleOptionScrollBar.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionScrollBar", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionScrollBar();

		expect(option.orientation).toBe(COrientation.Horizontal);
		expect(option.buttonSize).toBe(0);
		expect(option.trackStart).toBe(0);
		expect(option.trackLength).toBe(0);
		expect(option.thumbStart).toBe(0);
		expect(option.thumbLength).toBe(0);
	});

	test("copy constructor copies values", () => {
		const option = new CStyleOptionScrollBar();
		option.orientation = COrientation.Vertical;
		option.buttonSize = 16;
		option.trackStart = 16;
		option.trackLength = 168;
		option.thumbStart = 40;
		option.thumbLength = 32;

		const copy = new CStyleOptionScrollBar(option);

		expect(copy.orientation).toBe(COrientation.Vertical);
		expect(copy.buttonSize).toBe(16);
		expect(copy.trackStart).toBe(16);
		expect(copy.trackLength).toBe(168);
		expect(copy.thumbStart).toBe(40);
		expect(copy.thumbLength).toBe(32);
	});

	test("initFromScrollBar initializes base option", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setGeometry(10, 20, 200, 16);

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(scrollBar);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(16);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromScrollBar copies horizontal geometry", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setGeometry(0, 0, 200, 16);
		scrollBar.setRange(0, 100);
		scrollBar.setPageStep(20);
		scrollBar.setValue(50);

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(scrollBar);

		expect(option.orientation).toBe(COrientation.Horizontal);
		expect(option.buttonSize).toBe(scrollBar.buttonSize());
		expect(option.trackStart).toBe(scrollBar.trackStart());
		expect(option.trackLength).toBe(scrollBar.trackLength());
		expect(option.thumbStart).toBe(scrollBar.thumbStart());
		expect(option.thumbLength).toBe(scrollBar.thumbLength());
	});

	test("initFromScrollBar copies vertical geometry", () => {
		const scrollBar = new CScrollBar(COrientation.Vertical);
		scrollBar.setGeometry(0, 0, 16, 200);
		scrollBar.setRange(0, 100);
		scrollBar.setPageStep(20);
		scrollBar.setValue(50);

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(scrollBar);

		expect(option.orientation).toBe(COrientation.Vertical);
		expect(option.buttonSize).toBe(scrollBar.buttonSize());
		expect(option.trackStart).toBe(scrollBar.trackStart());
		expect(option.trackLength).toBe(scrollBar.trackLength());
		expect(option.thumbStart).toBe(scrollBar.thumbStart());
		expect(option.thumbLength).toBe(scrollBar.thumbLength());
	});

	test("initFromScrollBar copies disabled state", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setEnabled(false);

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(scrollBar);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromScrollBar copies focus state", () => {
		const scrollBar = new CScrollBar(COrientation.Horizontal);
		scrollBar.setFocus();

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(scrollBar);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces previous values and state", () => {
		const first = new CScrollBar(COrientation.Horizontal);
		first.setGeometry(0, 0, 200, 16);
		first.setRange(0, 100);
		first.setPageStep(20);
		first.setValue(50);
		first.setFocus();

		const option = new CStyleOptionScrollBar();
		option.initFromScrollBar(first);

		const second = new CScrollBar(COrientation.Vertical);
		second.setGeometry(0, 0, 20, 300);
		second.setRange(0, 200);
		second.setPageStep(40);
		second.setValue(100);

		option.initFromScrollBar(second);

		expect(option.orientation).toBe(COrientation.Vertical);
		expect(option.buttonSize).toBe(second.buttonSize());
		expect(option.trackStart).toBe(second.trackStart());
		expect(option.trackLength).toBe(second.trackLength());
		expect(option.thumbStart).toBe(second.thumbStart());
		expect(option.thumbLength).toBe(second.thumbLength());
		expect(option.state & CStyleState.HasFocus).toBe(0);
	});
});