import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CDialogResult } from "../../src/dialogs/CDialog.js";
import {
	CInputDialog,
	CInputDialogInputMode
} from "../../src/dialogs/CInputDialog.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CInputDialog", () =>
{
	beforeEach(() =>
	{
		new CApplication(createTestCanvas());
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has sensible defaults", () =>
	{
		const dialog = new CInputDialog();

		expect(dialog.inputMode()).toBe(
			CInputDialogInputMode.TextInput
		);
		expect(dialog.labelText()).toBe("");
		expect(dialog.textValue()).toBe("");
		expect(dialog.width()).toBe(CInputDialog.DefaultWidth);
		expect(dialog.height()).toBe(CInputDialog.DefaultHeight);
	});

	test("supports a parent widget", () =>
	{
		const parent = new CWidget();
		const dialog = new CInputDialog(parent);

		expect(dialog.parent()).toBe(parent);
		expect(parent.children()).toContain(dialog);
	});

	test("sets label text", () =>
	{
		const dialog = new CInputDialog();

		dialog.setLabelText("Enter your name:");

		expect(dialog.labelText()).toBe("Enter your name:");
	});

	test("sets text value", () =>
	{
		const dialog = new CInputDialog();

		dialog.setTextValue("Bojan");

		expect(dialog.textValue()).toBe("Bojan");
	});

	test("emits textValueChanged", () =>
	{
		const dialog = new CInputDialog();
		const changed = vi.fn();

		dialog.textValueChanged.connect(changed);
		dialog.setTextValue("Hello");

		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledWith("Hello");
	});

	test("does not emit textValueChanged for same value", () =>
	{
		const dialog = new CInputDialog();
		const changed = vi.fn();

		dialog.setTextValue("Hello");
		dialog.textValueChanged.connect(changed);

		dialog.setTextValue("Hello");

		expect(changed).not.toHaveBeenCalled();
	});

	test("sets input mode", () =>
	{
		const dialog = new CInputDialog();

		dialog.setInputMode(CInputDialogInputMode.IntInput);

		expect(dialog.inputMode()).toBe(
			CInputDialogInputMode.IntInput
		);
	});

	test("can switch input mode back to text", () =>
	{
		const dialog = new CInputDialog();

		dialog.setInputMode(CInputDialogInputMode.IntInput);
		dialog.setInputMode(CInputDialogInputMode.TextInput);

		expect(dialog.inputMode()).toBe(
			CInputDialogInputMode.TextInput
		);
	});

	test("sets integer value", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntValue(42);

		expect(dialog.intValue()).toBe(42);
	});

	test("emits intValueChanged", () =>
	{
		const dialog = new CInputDialog();
		const changed = vi.fn();

		dialog.intValueChanged.connect(changed);
		dialog.setIntValue(42);

		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledWith(42);
	});

	test("does not emit intValueChanged for same value", () =>
	{
		const dialog = new CInputDialog();
		const changed = vi.fn();

		dialog.setIntValue(42);
		dialog.intValueChanged.connect(changed);

		dialog.setIntValue(42);

		expect(changed).not.toHaveBeenCalled();
	});

	test("sets integer minimum", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntMinimum(-10);

		expect(dialog.intMinimum()).toBe(-10);
	});

	test("sets integer maximum", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntMaximum(250);

		expect(dialog.intMaximum()).toBe(250);
	});

	test("sets integer range", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntRange(-20, 50);

		expect(dialog.intMinimum()).toBe(-20);
		expect(dialog.intMaximum()).toBe(50);
	});

	test("integer value is clamped to range", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntRange(10, 20);

		dialog.setIntValue(5);
		expect(dialog.intValue()).toBe(10);

		dialog.setIntValue(25);
		expect(dialog.intValue()).toBe(20);
	});

	test("sets integer step", () =>
	{
		const dialog = new CInputDialog();

		dialog.setIntStep(5);

		expect(dialog.intStep()).toBe(5);
	});

	test("exec opens dialog modally", () =>
	{
		const dialog = new CInputDialog();

		dialog.exec();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isModal()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("accept closes dialog with accepted result", () =>
	{
		const dialog = new CInputDialog();

		dialog.exec();
		dialog.accept();

		expect(dialog.result()).toBe(CDialogResult.Accepted);
		expect(dialog.isOpen()).toBe(false);
	});

	test("reject closes dialog with rejected result", () =>
	{
		const dialog = new CInputDialog();

		dialog.exec();
		dialog.reject();

		expect(dialog.result()).toBe(CDialogResult.Rejected);
		expect(dialog.isOpen()).toBe(false);
	});

	test("getText creates an open text input dialog", () =>
	{
		const parent = new CWidget();

		CInputDialog.getText(
			parent,
			"Name",
			"Enter your name:",
			"Bojan"
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		expect(dialog).toBeDefined();
		expect(dialog.windowTitle()).toBe("Name");
		expect(dialog.labelText()).toBe("Enter your name:");
		expect(dialog.textValue()).toBe("Bojan");
		expect(dialog.inputMode()).toBe(
			CInputDialogInputMode.TextInput
		);
		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isModal()).toBe(true);
	});

	test("getText resolves text when accepted", async () =>
	{
		const parent = new CWidget();

		const result = CInputDialog.getText(
			parent,
			"Name",
			"Enter your name:",
			"Bojan"
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		dialog.setTextValue("Clara");
		dialog.accept();

		await expect(result).resolves.toBe("Clara");
	});

	test("getText resolves null when rejected", async () =>
	{
		const parent = new CWidget();

		const result = CInputDialog.getText(
			parent,
			"Name",
			"Enter your name:"
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		dialog.reject();

		await expect(result).resolves.toBeNull();
	});

	test("getInt creates an open integer input dialog", () =>
	{
		const parent = new CWidget();

		CInputDialog.getInt(
			parent,
			"Age",
			"Enter your age:",
			42,
			0,
			120,
			5
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		expect(dialog).toBeDefined();
		expect(dialog.windowTitle()).toBe("Age");
		expect(dialog.labelText()).toBe("Enter your age:");
		expect(dialog.inputMode()).toBe(
			CInputDialogInputMode.IntInput
		);
		expect(dialog.intValue()).toBe(42);
		expect(dialog.intMinimum()).toBe(0);
		expect(dialog.intMaximum()).toBe(120);
		expect(dialog.intStep()).toBe(5);
		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isModal()).toBe(true);
	});

	test("getInt resolves integer when accepted", async () =>
	{
		const parent = new CWidget();

		const result = CInputDialog.getInt(
			parent,
			"Age",
			"Enter your age:",
			42,
			0,
			120
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		dialog.setIntValue(52);
		dialog.accept();

		await expect(result).resolves.toBe(52);
	});

	test("getInt resolves null when rejected", async () =>
	{
		const parent = new CWidget();

		const result = CInputDialog.getInt(
			parent,
			"Age",
			"Enter your age:"
		);

		const dialog = parent.children().find(
			child => child instanceof CInputDialog
		) as CInputDialog;

		dialog.reject();

		await expect(result).resolves.toBeNull();
	});
});