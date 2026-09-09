import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CSlider } from "../../src/widgets/CSlider.js";
import { CStyleOptionSlider } from "../../src/gui/CStyleOptionSlider.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionSlider", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});
    
    test("has default values", () => {
		const option = new CStyleOptionSlider();

		expect(option.minimum).toBe(0);
		expect(option.maximum).toBe(100);
		expect(option.value).toBe(0);
	});

	test("copy constructor copies values", () => {
		const option = new CStyleOptionSlider();
		option.minimum = 10;
		option.maximum = 200;
		option.value = 75;

		const copy = new CStyleOptionSlider(option);

		expect(copy.minimum).toBe(10);
		expect(copy.maximum).toBe(200);
		expect(copy.value).toBe(75);
	});

	test("initFromSlider initializes base option", () => {
		const slider = new CSlider();
		slider.setGeometry(10, 20, 200, 30);

		const option = new CStyleOptionSlider();
		option.initFromSlider(slider);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(30);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromSlider copies range and value", () => {
		const slider = new CSlider();
		slider.setRange(10, 200);
		slider.setValue(75);

		const option = new CStyleOptionSlider();
		option.initFromSlider(slider);

		expect(option.minimum).toBe(10);
		expect(option.maximum).toBe(200);
		expect(option.value).toBe(75);
	});

	test("initFromSlider copies disabled state", () => {
		const slider = new CSlider();
		slider.setEnabled(false);

		const option = new CStyleOptionSlider();
		option.initFromSlider(slider);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromSlider copies focus state", () => {
		const slider = new CSlider();
		slider.setFocus();

		const option = new CStyleOptionSlider();
		option.initFromSlider(slider);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces previous values and state", () => {
		const first = new CSlider();
		first.setRange(10, 200);
		first.setValue(75);
		first.setFocus();

		const option = new CStyleOptionSlider();
		option.initFromSlider(first);

		const second = new CSlider();
		second.setRange(-50, 50);
		second.setValue(-20);

		option.initFromSlider(second);

		expect(option.minimum).toBe(-50);
		expect(option.maximum).toBe(50);
		expect(option.value).toBe(-20);
		expect(option.state & CStyleState.HasFocus).toBe(0);
	});
});