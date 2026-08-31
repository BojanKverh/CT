import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CDialogButtonBox,
	CStandardButton
} from "../../src/dialogs/CDialogButtonBox.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CDialogButtonBox", () =>
{
	beforeEach(() =>
	{
		const canvas = createTestCanvas();

		new CApplication(canvas);
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has no standard buttons by default", () =>
	{
		const buttonBox = new CDialogButtonBox();

		expect(buttonBox.standardButtons()).toBe(
			CStandardButton.NoButton
		);
	});

	test("stores standard buttons from constructor", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		expect(buttonBox.standardButtons()).toBe(
			CStandardButton.Ok | CStandardButton.Cancel
		);
	});

	test("creates OK and Cancel buttons", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		const buttons = buttonBox.children().filter(
			child => child instanceof CPushButton
		) as CPushButton[];

		expect(buttons.length).toBe(2);
		expect(buttons[0]!.text()).toBe("OK");
		expect(buttons[1]!.text()).toBe("Cancel");
	});

	test("OK emits accepted", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok
		);

		const slot = vi.fn();

		buttonBox.accepted.connect(slot);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("Yes emits accepted", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Yes
		);

		const slot = vi.fn();

		buttonBox.accepted.connect(slot);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("Cancel emits rejected", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Cancel
		);

		const slot = vi.fn();

		buttonBox.rejected.connect(slot);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("No emits rejected", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.No
		);

		const slot = vi.fn();

		buttonBox.rejected.connect(slot);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("Close emits rejected", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Close
		);

		const slot = vi.fn();

		buttonBox.rejected.connect(slot);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("Apply does not emit accepted or rejected", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Apply
		);

		const accepted = vi.fn();
		const rejected = vi.fn();

		buttonBox.accepted.connect(accepted);
		buttonBox.rejected.connect(rejected);

		const button = buttonBox.children().find(
			child => child instanceof CPushButton
		) as CPushButton;

		button.clicked.emit();

		expect(accepted).not.toHaveBeenCalled();
		expect(rejected).not.toHaveBeenCalled();
	});

	test("creates buttons in expected order", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Yes |
			CStandardButton.No |
			CStandardButton.Ok |
			CStandardButton.Apply |
			CStandardButton.Close |
			CStandardButton.Cancel
		);

		const buttons = buttonBox.children().filter(
			child => child instanceof CPushButton
		) as CPushButton[];

		expect(buttons.map(button => button.text())).toEqual([
			"Yes",
			"No",
			"OK",
			"Apply",
			"Close",
			"Cancel"
		]);
	});

	test("setStandardButtons replaces existing buttons", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		buttonBox.setStandardButtons(
			CStandardButton.Yes | CStandardButton.No
		);

		const buttons = buttonBox.children().filter(
			child => child instanceof CPushButton
		) as CPushButton[];

		expect(buttonBox.standardButtons()).toBe(
			CStandardButton.Yes | CStandardButton.No
		);

		expect(buttons.map(button => button.text())).toEqual([
			"Yes",
			"No"
		]);
	});

	test("setting same standard buttons keeps button set unchanged", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		const before = buttonBox.children().filter(
			child => child instanceof CPushButton
		);

		buttonBox.setStandardButtons(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		const after = buttonBox.children().filter(
			child => child instanceof CPushButton
		);

		expect(after).toEqual(before);
	});

	test("NoButton removes all buttons", () =>
	{
		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel
		);

		buttonBox.setStandardButtons(
			CStandardButton.NoButton
		);

		const buttons = buttonBox.children().filter(
			child => child instanceof CPushButton
		);

		expect(buttons).toEqual([]);
	});

	test("button box can have parent widget", () =>
	{
		const parent = new CDialogButtonBox();

		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok,
			parent
		);

		expect(buttonBox.parent()).toBe(parent);
	});
});