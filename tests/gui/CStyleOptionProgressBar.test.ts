import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CProgressBar } from "../../src/widgets/CProgressBar.js";
import { CStyleOptionProgressBar } from	"../../src/gui/CStyleOptionProgressBar.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";

describe("CStyleOptionProgressBar", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionProgressBar();

		expect(option.minimum).toBe(0);
		expect(option.maximum).toBe(100);
		expect(option.value).toBe(0);
	});

	test("copy constructor copies values", () => {
		const option = new CStyleOptionProgressBar();
		option.minimum = 10;
		option.maximum = 200;
		option.value = 80;

		const copy = new CStyleOptionProgressBar(option);

		expect(copy.minimum).toBe(10);
		expect(copy.maximum).toBe(200);
		expect(copy.value).toBe(80);
	});

	test("initFromProgressBar initializes base option", () => {
		const progressBar = new CProgressBar();
		progressBar.setGeometry(10, 20, 200, 30);

		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(progressBar);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(30);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromProgressBar copies range and value", () => {
		const progressBar = new CProgressBar();
		progressBar.setRange(10, 200);
		progressBar.setValue(80);

		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(progressBar);

		expect(option.minimum).toBe(10);
		expect(option.maximum).toBe(200);
		expect(option.value).toBe(80);
	});

	test("initFromProgressBar copies disabled state", () => {
		const progressBar = new CProgressBar();
		progressBar.setEnabled(false);

		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(progressBar);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromProgressBar copies focus state", () => {
		const progressBar = new CProgressBar();
		progressBar.setFocusPolicy(CFocusPolicy.StrongFocus);
		progressBar.setFocus();

		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(progressBar);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces previous values and state", () => {
		const first = new CProgressBar();
		first.setFocusPolicy(CFocusPolicy.StrongFocus);
		first.setRange(10, 200);
		first.setValue(80);
		first.setFocus();

		const option = new CStyleOptionProgressBar();
		option.initFromProgressBar(first);

		const second = new CProgressBar();
		second.setRange(-100, 100);
		second.setValue(-25);

		option.initFromProgressBar(second);

		expect(option.minimum).toBe(-100);
		expect(option.maximum).toBe(100);
		expect(option.value).toBe(-25);
		expect(option.state & CStyleState.HasFocus).toBe(0);
	});
});