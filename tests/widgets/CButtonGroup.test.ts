import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CButtonGroup } from "../../src/widgets/CButtonGroup.js";
import { CCheckBox } from "../../src/widgets/CCheckBox.js";
import { CRadioButton } from "../../src/widgets/CRadioButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CButtonGroup", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("is exclusive by default", () => {
		const group = new CButtonGroup();

		expect(group.isExclusive()).toBe(true);
	});

	test("adds buttons", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		group.addButton(radio1);
		group.addButton(radio2);

		expect(group.buttons()).toEqual([radio1, radio2]);
	});

	test("does not add same button twice", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");

		group.addButton(radio);
		group.addButton(radio);

		expect(group.buttons()).toEqual([radio]);
	});

	test("removes button", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		group.addButton(radio1);
		group.addButton(radio2);
		group.removeButton(radio1);

		expect(group.buttons()).toEqual([radio2]);
	});

	test("removing unknown button does nothing", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");

		group.removeButton(radio);

		expect(group.buttons()).toEqual([]);
	});

	test("returns checked button", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		group.addButton(radio1);
		group.addButton(radio2);

		radio2.setChecked(true);

		expect(group.checkedButton()).toBe(radio2);
	});

	test("returns null when no button is checked", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");

		group.addButton(radio);

		expect(group.checkedButton()).toBeNull();
	});

	test("checking one button unchecks another in exclusive group", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		group.addButton(radio1);
		group.addButton(radio2);

		radio1.setChecked(true);
		radio2.setChecked(true);

		expect(radio1.isChecked()).toBe(false);
		expect(radio2.isChecked()).toBe(true);
		expect(group.checkedButton()).toBe(radio2);
	});

	test("adding checked button unchecks previously checked button", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		radio1.setChecked(true);
		radio2.setChecked(true);

		group.addButton(radio1);
		group.addButton(radio2);

		expect(radio1.isChecked()).toBe(false);
		expect(radio2.isChecked()).toBe(true);
	});

	test("non-exclusive group allows multiple checked buttons", () => {
		const group = new CButtonGroup();
		const check1 = new CCheckBox();
		const check2 = new CCheckBox();

		group.setExclusive(false);
		group.addButton(check1);
		group.addButton(check2);

		check1.setChecked(true);
		check2.setChecked(true);

		expect(check1.isChecked()).toBe(true);
		expect(check2.isChecked()).toBe(true);
	});

	test("switching to exclusive mode leaves only one checked button", () => {
		const group = new CButtonGroup();
		const check1 = new CCheckBox();
		const check2 = new CCheckBox();

		group.setExclusive(false);
		group.addButton(check1);
		group.addButton(check2);

		check1.setChecked(true);
		check2.setChecked(true);

		group.setExclusive(true);

		const checked = group.buttons().filter(button => button.isChecked());

		expect(checked).toHaveLength(1);
		expect(group.checkedButton()).toBe(checked[0]);
	});

	test("emits buttonClicked for button in group", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");
		const slot = vi.fn();

		group.addButton(radio);
		group.buttonClicked.connect(slot);

		radio.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(radio);
	});

	test("emits buttonToggled when button is toggled", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");
		const slot = vi.fn();

		group.addButton(radio);
		group.buttonToggled.connect(slot);

		radio.setChecked(true);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(radio, true);
	});

	test("removed button no longer emits buttonClicked through group", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");
		const slot = vi.fn();

		group.addButton(radio);
		group.buttonClicked.connect(slot);

		group.removeButton(radio);
		radio.clicked.emit();

		expect(slot).not.toHaveBeenCalled();
	});

	test("removed button no longer emits buttonToggled through group", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("One");
		const slot = vi.fn();

		group.addButton(radio);
		group.buttonToggled.connect(slot);

		group.removeButton(radio);
		radio.setChecked(true);

		expect(slot).not.toHaveBeenCalled();
	});

	test("removed button no longer participates in exclusivity", () => {
		const group = new CButtonGroup();
		const radio1 = new CRadioButton("One");
		const radio2 = new CRadioButton("Two");

		group.addButton(radio1);
		group.addButton(radio2);

		group.removeButton(radio1);

		radio1.setChecked(true);
		radio2.setChecked(true);

		expect(radio1.isChecked()).toBe(true);
		expect(radio2.isChecked()).toBe(true);
	});

	test("group can contain different checkable button types", () => {
		const group = new CButtonGroup();
		const radio = new CRadioButton("Radio");
		const check = new CCheckBox();

		group.addButton(radio);
		group.addButton(check);

		radio.setChecked(true);
		check.setChecked(true);

		expect(radio.isChecked()).toBe(false);
		expect(check.isChecked()).toBe(true);
	});
});