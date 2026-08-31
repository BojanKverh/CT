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
import { CProgressDialog }
	from "../../src/dialogs/CProgressDialog.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CProgressDialog", () =>
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
		const dialog = new CProgressDialog();

		expect(dialog.labelText()).toBe("");
		expect(dialog.minimum()).toBe(0);
		expect(dialog.maximum()).toBe(100);
		expect(dialog.value()).toBe(0);
		expect(dialog.autoClose()).toBe(true);
		expect(dialog.wasCanceled()).toBe(false);
	});

	test("stores parent", () =>
	{
		const parent = new CWidget();
		const dialog = new CProgressDialog(
			"Copying",
			true,
			0,
			100,
			parent
		);

		expect(dialog.parent()).toBe(parent);
	});

	test("sets constructor values", () =>
	{
		const dialog = new CProgressDialog(
			"Copying files",
			true,
			10,
			200
		);

		expect(dialog.labelText()).toBe("Copying files");
		expect(dialog.minimum()).toBe(10);
		expect(dialog.maximum()).toBe(200);
	});

	test("sets label text", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setLabelText("Loading data");

		expect(dialog.labelText()).toBe("Loading data");
	});

	test("sets minimum", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setMinimum(20);

		expect(dialog.minimum()).toBe(20);
	});

	test("sets maximum", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setMaximum(250);

		expect(dialog.maximum()).toBe(250);
	});

	test("sets range", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setRange(10, 90);

		expect(dialog.minimum()).toBe(10);
		expect(dialog.maximum()).toBe(90);
	});

	test("sets value", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setValue(42);

		expect(dialog.value()).toBe(42);
	});

	test("sets autoClose", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setAutoClose(false);

		expect(dialog.autoClose()).toBe(false);

		dialog.setAutoClose(true);

		expect(dialog.autoClose()).toBe(true);
	});

	test("exec opens dialog", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("reaching maximum accepts dialog when autoClose is enabled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.setValue(100);

		expect(dialog.result()).toBe(CDialogResult.Accepted);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("value above maximum accepts dialog when autoClose is enabled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.setValue(150);

		expect(dialog.result()).toBe(CDialogResult.Accepted);
		expect(dialog.isOpen()).toBe(false);
	});

	test("value below maximum does not close dialog", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.setValue(99);

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.result()).toBe(CDialogResult.Rejected);
	});

	test("reaching maximum does not close when autoClose is disabled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setAutoClose(false);
		dialog.exec();
		dialog.setValue(100);

		expect(dialog.value()).toBe(100);
		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("cancel marks dialog as canceled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.cancel();

		expect(dialog.wasCanceled()).toBe(true);
	});

	test("cancel rejects dialog", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.cancel();

		expect(dialog.result()).toBe(CDialogResult.Rejected);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("cancel emits canceled signal", () =>
	{
		const dialog = new CProgressDialog();
		const canceled = vi.fn();

		dialog.canceled.connect(canceled);

		dialog.exec();
		dialog.cancel();

		expect(canceled).toHaveBeenCalledTimes(1);
	});

	test("cancel emits canceled only once", () =>
	{
		const dialog = new CProgressDialog();
		const canceled = vi.fn();

		dialog.canceled.connect(canceled);

		dialog.exec();

		dialog.cancel();
		dialog.cancel();
		dialog.cancel();

		expect(canceled).toHaveBeenCalledTimes(1);
	});

	test("cancel keeps wasCanceled true after repeated calls", () =>
	{
		const dialog = new CProgressDialog();

		dialog.cancel();
		dialog.cancel();

		expect(dialog.wasCanceled()).toBe(true);
	});

	test("setting value below maximum does not mark dialog canceled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setValue(50);

		expect(dialog.wasCanceled()).toBe(false);
	});

	test("auto close does not mark dialog canceled", () =>
	{
		const dialog = new CProgressDialog();

		dialog.exec();
		dialog.setValue(100);

		expect(dialog.wasCanceled()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Accepted);
	});

	test("uses custom range for auto close", () =>
	{
		const dialog = new CProgressDialog(
			"Working",
			true,
			20,
			40
		);

		dialog.exec();

		dialog.setValue(39);
		expect(dialog.isOpen()).toBe(true);

		dialog.setValue(40);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Accepted);
	});

	test("changing maximum affects auto close threshold", () =>
	{
		const dialog = new CProgressDialog();

		dialog.setMaximum(200);
		dialog.exec();

		dialog.setValue(100);
		expect(dialog.isOpen()).toBe(true);

		dialog.setValue(200);
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Accepted);
	});

	test("can be created without cancel button", () =>
	{
		const dialog = new CProgressDialog(
			"Loading",
			false,
			0,
			100
		);

		expect(dialog.labelText()).toBe("Loading");
		expect(dialog.minimum()).toBe(0);
		expect(dialog.maximum()).toBe(100);
		expect(dialog.wasCanceled()).toBe(false);
	});

	test("dialog without cancel button can auto close", () =>
	{
		const dialog = new CProgressDialog(
			"Loading",
			false,
			0,
			100
		);

		dialog.exec();
		dialog.setValue(100);

		expect(dialog.result()).toBe(CDialogResult.Accepted);
		expect(dialog.isOpen()).toBe(false);
	});

	test("dialog without cancel button remains open at maximum when autoClose is disabled",
		() =>
	{
		const dialog = new CProgressDialog(
			"Loading",
			false,
			0,
			100
		);

		dialog.setAutoClose(false);
		dialog.exec();
		dialog.setValue(100);

		expect(dialog.value()).toBe(100);
		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});
});