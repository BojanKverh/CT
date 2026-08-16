import {afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CCheckBox } from "../../src/widgets/CCheckBox.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CCheckBox", () => {
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
		const checkBox = new CCheckBox();

		expect(checkBox.isChecked()).toBe(false);
	});

	test("sets checked state", () => {
		const checkBox = new CCheckBox();

		checkBox.setChecked(true);

		expect(checkBox.isChecked()).toBe(true);
	});

	test("emits toggled when checked state changes", () => {
		const checkBox = new CCheckBox();
		const slot = vi.fn();

		checkBox.toggled.connect(slot);
		checkBox.setChecked(true);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(true);
	});

	test("does not emit toggled when checked state is unchanged", () => {
		const checkBox = new CCheckBox();
		const slot = vi.fn();

		checkBox.setChecked(true);
		checkBox.toggled.connect(slot);

		checkBox.setChecked(true);

		expect(slot).not.toHaveBeenCalled();
	});

	test("toggles checked state", () => {
		const checkBox = new CCheckBox();

		checkBox.toggle();
		expect(checkBox.isChecked()).toBe(true);

		checkBox.toggle();
		expect(checkBox.isChecked()).toBe(false);
	});

	test("has empty text by default", () => {
		const checkBox = new CCheckBox();

		expect(checkBox.text()).toBe("");
	});

	test("sets text", () => {
		const checkBox = new CCheckBox();

		checkBox.setText("Enable feature");

		expect(checkBox.text()).toBe("Enable feature");
	});

	test("toggles on left mouse release inside widget", () => {
		const checkBox = new CCheckBox();
		checkBox.resize(200, 30);

		const event = new CMouseEvent(
			CEventType.MouseRelease,
			10,
			10,
			CMouseButton.LeftButton
		);

		checkBox.event(event);

		expect(checkBox.isChecked()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores non-left mouse release", () => {
		const checkBox = new CCheckBox();
		checkBox.resize(200, 30);

		const event = new CMouseEvent(
			CEventType.MouseRelease,
			10,
			10,
			CMouseButton.RightButton
		);

		checkBox.event(event);

		expect(checkBox.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("does not toggle on mouse release outside widget", () => {
		const checkBox = new CCheckBox();
		checkBox.resize(200, 30);

		const event = new CMouseEvent(
			CEventType.MouseRelease,
			250,
			10,
			CMouseButton.LeftButton
		);

		checkBox.event(event);

		expect(checkBox.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("toggles on space key press", () => {
		const checkBox = new CCheckBox();

		const event = new CKeyEvent(
			CEventType.KeyPress,
			" "
		);

		checkBox.event(event);

		expect(checkBox.isChecked()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores other key presses", () => {
		const checkBox = new CCheckBox();

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"Enter"
		);

		checkBox.event(event);

		expect(checkBox.isChecked()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("disabled checkbox does not toggle with mouse", () => {
		const checkBox = new CCheckBox();
		checkBox.resize(200, 30);
		checkBox.setEnabled(false);

		checkBox.event(new CMouseEvent(
			CEventType.MouseRelease,
			10,
			10,
			CMouseButton.LeftButton
		));

		expect(checkBox.isChecked()).toBe(false);
	});

	test("disabled checkbox does not toggle with keyboard", () => {
		const checkBox = new CCheckBox();
		checkBox.setEnabled(false);

		checkBox.event(new CKeyEvent(
			CEventType.KeyPress,
			" "
		));

		expect(checkBox.isChecked()).toBe(false);
	});

	test("accepts left mouse press", () => {
		const checkBox = new CCheckBox();
		checkBox.resize(200, 30);

		const event = new CMouseEvent(CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton
		);
		checkBox.event(event);
		expect(event.isAccepted()).toBe(true);
	});
});