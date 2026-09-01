import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CColorDialog } from "../../src/dialogs/CColorDialog.js";
import { CDialogResult } from "../../src/dialogs/CDialog.js";
import { CColor } from "../../src/gui/CColor.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CColorDialog", () =>
{
	beforeEach(() =>
	{
		const canvas = createTestCanvas();
		new CApplication(canvas);
	});

	afterEach(() =>
	{
		CApplication.instance().destroy();
	});

	test("has sensible defaults", () =>
	{
		const dialog = new CColorDialog();

		expect(dialog.width()).toBe(CColorDialog.DefaultWidth);
		expect(dialog.height()).toBe(CColorDialog.DefaultHeight);

		const color = dialog.currentColor();

		expect(color.red()).toBe(0);
		expect(color.green()).toBe(0);
		expect(color.blue()).toBe(0);
	});

	test("stores parent", () =>
	{
		const parent = new CWidget();
		const dialog = new CColorDialog(
			new CColor(10, 20, 30),
			parent
		);

		expect(dialog.parent()).toBe(parent);
	});

	test("uses initial color", () =>
	{
		const dialog = new CColorDialog(
			new CColor(10, 20, 30)
		);

		const color = dialog.currentColor();

		expect(color.red()).toBe(10);
		expect(color.green()).toBe(20);
		expect(color.blue()).toBe(30);
	});

	test("setCurrentColor changes current color", () =>
	{
		const dialog = new CColorDialog();

		dialog.setCurrentColor(new CColor(40, 50, 60));

		const color = dialog.currentColor();

		expect(color.red()).toBe(40);
		expect(color.green()).toBe(50);
		expect(color.blue()).toBe(60);
	});

	test("setCurrentColor emits currentColorChanged", () =>
	{
		const dialog = new CColorDialog();
		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		const color = new CColor(40, 50, 60);
		dialog.setCurrentColor(color);

		expect(changed).toHaveBeenCalledTimes(1);
		expect(changed).toHaveBeenCalledWith(color);
	});

	test("setCurrentColor emits currentColorChanged only once", () =>
	{
		const dialog = new CColorDialog();
		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(40, 50, 60));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("does not emit currentColorChanged for same color", () =>
	{
		const dialog = new CColorDialog(
			new CColor(40, 50, 60)
		);

		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(40, 50, 60));

		expect(changed).not.toHaveBeenCalled();
	});

	test("emits currentColorChanged when red changes", () =>
	{
		const dialog = new CColorDialog(
			new CColor(40, 50, 60)
		);

		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(41, 50, 60));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("emits currentColorChanged when green changes", () =>
	{
		const dialog = new CColorDialog(
			new CColor(40, 50, 60)
		);

		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(40, 51, 60));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("emits currentColorChanged when blue changes", () =>
	{
		const dialog = new CColorDialog(
			new CColor(40, 50, 60)
		);

		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(40, 50, 61));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("can change current color multiple times", () =>
	{
		const dialog = new CColorDialog();

		dialog.setCurrentColor(new CColor(10, 20, 30));
		dialog.setCurrentColor(new CColor(40, 50, 60));
		dialog.setCurrentColor(new CColor(70, 80, 90));

		const color = dialog.currentColor();

		expect(color.red()).toBe(70);
		expect(color.green()).toBe(80);
		expect(color.blue()).toBe(90);
	});

	test("emits for every different current color", () =>
	{
		const dialog = new CColorDialog();
		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(10, 20, 30));
		dialog.setCurrentColor(new CColor(40, 50, 60));
		dialog.setCurrentColor(new CColor(70, 80, 90));

		expect(changed).toHaveBeenCalledTimes(3);
	});

	test("does not emit repeatedly for equal colors", () =>
	{
		const dialog = new CColorDialog();
		const changed = vi.fn();

		dialog.currentColorChanged.connect(changed);

		dialog.setCurrentColor(new CColor(10, 20, 30));
		dialog.setCurrentColor(new CColor(10, 20, 30));
		dialog.setCurrentColor(new CColor(10, 20, 30));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("supports minimum RGB values", () =>
	{
		const dialog = new CColorDialog(
			new CColor(255, 255, 255)
		);

		dialog.setCurrentColor(new CColor(0, 0, 0));

		const color = dialog.currentColor();

		expect(color.red()).toBe(0);
		expect(color.green()).toBe(0);
		expect(color.blue()).toBe(0);
	});

	test("supports maximum RGB values", () =>
	{
		const dialog = new CColorDialog();

		dialog.setCurrentColor(new CColor(255, 255, 255));

		const color = dialog.currentColor();

		expect(color.red()).toBe(255);
		expect(color.green()).toBe(255);
		expect(color.blue()).toBe(255);
	});

	test("exec opens dialog", () =>
	{
		const dialog = new CColorDialog();

		dialog.exec();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("accept accepts dialog", () =>
	{
		const dialog = new CColorDialog();

		dialog.exec();
		dialog.accept();

		expect(dialog.result()).toBe(CDialogResult.Accepted);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("reject rejects dialog", () =>
	{
		const dialog = new CColorDialog();

		dialog.exec();
		dialog.reject();

		expect(dialog.result()).toBe(CDialogResult.Rejected);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("direct accept does not emit colorSelected", () =>
	{
		const dialog = new CColorDialog();
		const selected = vi.fn();

		dialog.colorSelected.connect(selected);

		dialog.accept();

		expect(selected).not.toHaveBeenCalled();
	});

	test("direct reject does not emit colorSelected", () =>
	{
		const dialog = new CColorDialog();
		const selected = vi.fn();

		dialog.colorSelected.connect(selected);

		dialog.reject();

		expect(selected).not.toHaveBeenCalled();
	});

	test("currentColor returns a copy", () =>
	{
		const dialog = new CColorDialog(
			new CColor(10, 20, 30)
		);

		const color = dialog.currentColor();

		color.setColor("#aabbcc");

		expect(dialog.currentColor().red()).toBe(10);
		expect(dialog.currentColor().green()).toBe(20);
		expect(dialog.currentColor().blue()).toBe(30);
	});

	test("constructor copies initial color", () =>
	{
		const initial = new CColor(10, 20, 30);
		const dialog = new CColorDialog(initial);

		initial.setColor("#aabbcc");

		const color = dialog.currentColor();

		expect(color.red()).toBe(10);
		expect(color.green()).toBe(20);
		expect(color.blue()).toBe(30);
	});

	test("setCurrentColor copies color", () =>
	{
		const dialog = new CColorDialog();
		const source = new CColor(40, 50, 60);

		dialog.setCurrentColor(source);

		source.setColor("#aabbcc");

		const color = dialog.currentColor();

		expect(color.red()).toBe(40);
		expect(color.green()).toBe(50);
		expect(color.blue()).toBe(60);
	});

	test("currentColorChanged emits a copy", () =>
	{
		const dialog = new CColorDialog();
		let emitted: CColor | null = null;

		dialog.currentColorChanged.connect(color =>
		{
			emitted = color;
		});

		dialog.setCurrentColor(new CColor(40, 50, 60));

		expect(emitted).not.toBeNull();

		emitted!.setColor("#aabbcc");

		const color = dialog.currentColor();

		expect(color.red()).toBe(40);
		expect(color.green()).toBe(50);
		expect(color.blue()).toBe(60);
	});
});