import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CRadioButton } from "../../src/widgets/CRadioButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CRadioButton", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("is unchecked by default", () => {
		const radio = new CRadioButton();

		expect(radio.isChecked()).toBe(false);
	});

	test("has empty text by default", () => {
		const radio = new CRadioButton();

		expect(radio.text()).toBe("");
	});

	test("stores text from constructor", () => {
		const radio = new CRadioButton("Option 1");

		expect(radio.text()).toBe("Option 1");
	});

	test("sets text", () => {
		const radio = new CRadioButton();

		radio.setText("Option 2");

		expect(radio.text()).toBe("Option 2");
	});

	test("sets checked state", () => {
		const radio = new CRadioButton();

		radio.setChecked(true);

		expect(radio.isChecked()).toBe(true);
	});

	test("can be unchecked programmatically", () => {
		const radio = new CRadioButton();
		radio.setChecked(true);

		radio.setChecked(false);

		expect(radio.isChecked()).toBe(false);
	});

	test("emits toggled when checked state changes", () => {
		const radio = new CRadioButton();
		const slot = vi.fn();

		radio.toggled.connect(slot);
		radio.setChecked(true);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(true);
	});

	test("does not emit toggled when checked state is unchanged", () => {
		const radio = new CRadioButton();
		radio.setChecked(true);

		const slot = vi.fn();
		radio.toggled.connect(slot);

		radio.setChecked(true);

		expect(slot).not.toHaveBeenCalled();
	});

	test("left mouse release checks radio button", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);

		const event = new CMouseEvent(CEventType.MouseRelease, 10, 10,
			CMouseButton.LeftButton);

		radio.event(event);

		expect(radio.isChecked()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("left mouse release does not uncheck already checked radio button", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);
		radio.setChecked(true);

		radio.event(new CMouseEvent(CEventType.MouseRelease, 10, 10,
			CMouseButton.LeftButton));

		expect(radio.isChecked()).toBe(true);
	});

	test("ignores non-left mouse release", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);

		const event = new CMouseEvent(CEventType.MouseRelease, 10, 10,
			CMouseButton.RightButton);

		radio.event(event);

		expect(radio.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("does not check on mouse release outside widget", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);

		const event = new CMouseEvent(CEventType.MouseRelease, 200, 10,
			CMouseButton.LeftButton);

		radio.event(event);

		expect(radio.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("accepts left mouse press", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);

		const event = new CMouseEvent(CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton);

		radio.event(event);

		expect(event.isAccepted()).toBe(true);
	});

	test("space checks radio button", () => {
		const radio = new CRadioButton();

		const event = new CKeyEvent(CEventType.KeyPress, " ");
		radio.event(event);

		expect(radio.isChecked()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("space does not uncheck already checked radio button", () => {
		const radio = new CRadioButton();
		radio.setChecked(true);

		radio.event(new CKeyEvent(CEventType.KeyPress, " "));

		expect(radio.isChecked()).toBe(true);
	});

	test("ignores unsupported key", () => {
		const radio = new CRadioButton();

		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		radio.event(event);

		expect(radio.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("disabled radio button does not check with mouse", () => {
		const radio = new CRadioButton();
		radio.resize(150, 30);
		radio.setEnabled(false);

		radio.event(new CMouseEvent(CEventType.MouseRelease, 10, 10,
			CMouseButton.LeftButton));

		expect(radio.isChecked()).toBe(false);
	});

	test("disabled radio button does not check with keyboard", () => {
		const radio = new CRadioButton();
		radio.setEnabled(false);

		radio.event(new CKeyEvent(CEventType.KeyPress, " "));

		expect(radio.isChecked()).toBe(false);
	});
});