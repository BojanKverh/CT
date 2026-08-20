import { describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";

describe("CAction", () => {
	test("stores text", () => {
		const action = new CAction("Open");

		expect(action.text()).toBe("Open");
	});

	test("changes text", () => {
		const action = new CAction("Open");

		action.setText("Save");

		expect(action.text()).toBe("Save");
	});

	test("is enabled by default", () => {
		const action = new CAction();

		expect(action.isEnabled()).toBe(true);
	});

	test("changes enabled state", () => {
		const action = new CAction();

		action.setEnabled(false);

		expect(action.isEnabled()).toBe(false);
	});

	test("is not checkable by default", () => {
		const action = new CAction();

		expect(action.isCheckable()).toBe(false);
		expect(action.isChecked()).toBe(false);
	});

	test("can be made checkable", () => {
		const action = new CAction();

		action.setCheckable(true);
		action.setChecked(true);

		expect(action.isCheckable()).toBe(true);
		expect(action.isChecked()).toBe(true);
	});

	test("cannot stay checked when not checkable", () => {
		const action = new CAction();

		action.setCheckable(true);
		action.setChecked(true);
		action.setCheckable(false);

		expect(action.isCheckable()).toBe(false);
		expect(action.isChecked()).toBe(false);
	});

	test("emits toggled when checked state changes", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setCheckable(true);
		action.toggled.connect(slot);

		action.setChecked(true);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(true);
	});

	test("does not emit toggled when checked state is unchanged", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setCheckable(true);
		action.setChecked(true);
		action.toggled.connect(slot);

		action.setChecked(true);

		expect(slot).not.toHaveBeenCalled();
	});

	test("trigger emits triggered", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.triggered.connect(slot);
		action.trigger();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("disabled action does not trigger", () => {
		const action = new CAction();
		const slot = vi.fn();

		action.setEnabled(false);
		action.triggered.connect(slot);

		action.trigger();

		expect(slot).not.toHaveBeenCalled();
	});

	test("trigger toggles checkable action", () => {
		const action = new CAction();

		action.setCheckable(true);

		action.trigger();
		expect(action.isChecked()).toBe(true);

		action.trigger();
		expect(action.isChecked()).toBe(false);
	});
});