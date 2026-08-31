import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CMessageBox, CMessageBoxIcon} from "../../src/dialogs/CMessageBox.js";
import { CStandardButton } from "../../src/dialogs/CDialogButtonBox.js";
import { CDialogResult } from "../../src/dialogs/CDialog.js";
import { CWidget } from "../../src/widgets/CWidget.js";

describe("CMessageBox", () =>
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
		const box = new CMessageBox();

		expect(box.text()).toBe("");
		expect(box.informativeText()).toBe("");
		expect(box.icon()).toBe(CMessageBoxIcon.NoIcon);
		expect(box.standardButtons()).toBe(CStandardButton.Ok);
		expect(box.clickedButton()).toBe(CStandardButton.NoButton);
		expect(box.width()).toBe(CMessageBox.DefaultWidth);
		expect(box.height()).toBe(CMessageBox.DefaultHeight);
	});

	test("sets text", () =>
	{
		const box = new CMessageBox();

		box.setText("Hello");

		expect(box.text()).toBe("Hello");
	});

	test("sets informative text", () =>
	{
		const box = new CMessageBox();

		box.setInformativeText("Additional information");

		expect(box.informativeText()).toBe("Additional information");
	});

	test("clears informative text", () =>
	{
		const box = new CMessageBox();

		box.setInformativeText("Additional information");
		box.setInformativeText("");

		expect(box.informativeText()).toBe("");
	});

	test("sets icon", () =>
	{
		const box = new CMessageBox();

		box.setIcon(CMessageBoxIcon.Warning);

		expect(box.icon()).toBe(CMessageBoxIcon.Warning);
	});

	test("supports all icons", () =>
	{
		const box = new CMessageBox();

		for (const icon of [
			CMessageBoxIcon.NoIcon,
			CMessageBoxIcon.Information,
			CMessageBoxIcon.Warning,
			CMessageBoxIcon.Critical,
			CMessageBoxIcon.Question
		]) {
			box.setIcon(icon);
			expect(box.icon()).toBe(icon);
		}
	});

	test("sets standard buttons", () =>
	{
		const box = new CMessageBox();

		box.setStandardButtons(
			CStandardButton.Yes | CStandardButton.No
		);

		expect(box.standardButtons()).toBe(
			CStandardButton.Yes | CStandardButton.No
		);
	});

	test("supports no buttons", () =>
	{
		const box = new CMessageBox();

		box.setStandardButtons(CStandardButton.NoButton);

		expect(box.standardButtons()).toBe(
			CStandardButton.NoButton
		);
	});

	test("starts closed", () =>
	{
		const box = new CMessageBox();

		expect(box.isOpen()).toBe(false);
		expect(box.isVisible()).toBe(false);
	});

	test("opens modally with exec", () =>
	{
		const box = new CMessageBox();

		box.exec();

		expect(box.isOpen()).toBe(true);
		expect(box.isModal()).toBe(true);
		expect(box.isVisible()).toBe(true);
	});

	test("resets clicked button when opened", () =>
	{
		const box = new CMessageBox();

		box.setStandardButtons(CStandardButton.Ok);
		box.exec();

		expect(box.clickedButton()).toBe(
			CStandardButton.NoButton
		);
	});

	test("rejects when dialog is rejected", () =>
	{
		const box = new CMessageBox();

		box.exec();
		box.reject();

		expect(box.result()).toBe(CDialogResult.Rejected);
		expect(box.isOpen()).toBe(false);
	});

	test("accepts when dialog is accepted", () =>
	{
		const box = new CMessageBox();

		box.exec();
		box.accept();

		expect(box.result()).toBe(CDialogResult.Accepted);
		expect(box.isOpen()).toBe(false);
	});

	test("supports a parent widget", () =>
	{
		const parent = new CWidget();
		const box = new CMessageBox(parent);

		expect(box.parent()).toBe(parent);
		expect(parent.children()).toContain(box);
	});

	test("information creates an information message box", () =>
	{
		const parent = new CWidget();

		const box = CMessageBox.information(
			parent,
			"Information",
			"Operation completed"
		);

		expect(box.parent()).toBe(parent);
		expect(box.windowTitle()).toBe("Information");
		expect(box.text()).toBe("Operation completed");
		expect(box.icon()).toBe(CMessageBoxIcon.Information);
		expect(box.standardButtons()).toBe(CStandardButton.Ok);
		expect(box.isOpen()).toBe(true);
		expect(box.isModal()).toBe(true);
	});

	test("warning creates a warning message box", () =>
	{
		const box = CMessageBox.warning(
			null,
			"Warning",
			"Something happened"
		);

		expect(box.windowTitle()).toBe("Warning");
		expect(box.text()).toBe("Something happened");
		expect(box.icon()).toBe(CMessageBoxIcon.Warning);
		expect(box.standardButtons()).toBe(CStandardButton.Ok);
		expect(box.isOpen()).toBe(true);
	});

	test("critical creates a critical message box", () =>
	{
		const box = CMessageBox.critical(
			null,
			"Critical",
			"Something failed"
		);

		expect(box.windowTitle()).toBe("Critical");
		expect(box.text()).toBe("Something failed");
		expect(box.icon()).toBe(CMessageBoxIcon.Critical);
		expect(box.standardButtons()).toBe(CStandardButton.Ok);
		expect(box.isOpen()).toBe(true);
	});

	test("question creates a Yes/No message box", () =>
	{
		const box = CMessageBox.question(
			null,
			"Question",
			"Continue?"
		);

		expect(box.windowTitle()).toBe("Question");
		expect(box.text()).toBe("Continue?");
		expect(box.icon()).toBe(CMessageBoxIcon.Question);
		expect(box.standardButtons()).toBe(
			CStandardButton.Yes | CStandardButton.No
		);
		expect(box.isOpen()).toBe(true);
	});

	test("convenience methods accept custom buttons", () =>
	{
		const box = CMessageBox.warning(
			null,
			"Warning",
			"Continue?",
			CStandardButton.Yes |
				CStandardButton.No |
				CStandardButton.Cancel
		);

		expect(box.standardButtons()).toBe(
			CStandardButton.Yes |
				CStandardButton.No |
				CStandardButton.Cancel
		);
	});

	test("emits accepted when accepted", () =>
	{
		const box = new CMessageBox();
		const accepted = vi.fn();

		box.accepted.connect(accepted);

		box.exec();
		box.accept();

		expect(accepted).toHaveBeenCalledTimes(1);
	});

	test("emits rejected when rejected", () =>
	{
		const box = new CMessageBox();
		const rejected = vi.fn();

		box.rejected.connect(rejected);

		box.exec();
		box.reject();

		expect(rejected).toHaveBeenCalledTimes(1);
	});
});