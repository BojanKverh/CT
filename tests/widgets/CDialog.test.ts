import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CDialog, CDialogResult } from "../../src/widgets/CDialog.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CDialog", () =>
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

	test("is closed by default", () =>
	{
		const dialog = new CDialog();

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("stores window title", () =>
	{
		const dialog = new CDialog();

		dialog.setWindowTitle("Settings");

		expect(dialog.windowTitle()).toBe("Settings");
	});

	test("opens dialog", () =>
	{
		const dialog = new CDialog();

		dialog.open();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("open does nothing when already open", () =>
	{
		const dialog = new CDialog();

		dialog.open();
		dialog.open();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isVisible()).toBe(true);
	});

	test("closes dialog", () =>
	{
		const dialog = new CDialog();

		dialog.open();
		dialog.close();

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.isVisible()).toBe(false);
	});

	test("is modeless by default", () =>
	{
		const dialog = new CDialog();

		expect(dialog.isModal()).toBe(false);
	});

	test("sets modal state", () =>
	{
		const dialog = new CDialog();

		dialog.setModal(true);

		expect(dialog.isModal()).toBe(true);
	});

	test("exec opens dialog modally", () =>
	{
		const dialog = new CDialog();

		dialog.exec();

		expect(dialog.isOpen()).toBe(true);
		expect(dialog.isModal()).toBe(true);
		expect(CApplication.instance().topModalWidget()).toBe(dialog);
	});

	test("modeless open does not register modal widget", () =>
	{
		const dialog = new CDialog();

		dialog.open();

		expect(CApplication.instance().topModalWidget()).toBeNull();
	});

	test("modal open registers dialog", () =>
	{
		const dialog = new CDialog();

		dialog.setModal(true);
		dialog.open();

		expect(CApplication.instance().topModalWidget()).toBe(dialog);
	});

	test("closing modal dialog unregisters it", () =>
	{
		const dialog = new CDialog();

		dialog.exec();

		expect(CApplication.instance().topModalWidget()).toBe(dialog);

		dialog.close();

		expect(CApplication.instance().topModalWidget()).toBeNull();
	});

	test("accept closes dialog and sets accepted result", () =>
	{
		const dialog = new CDialog();

		dialog.exec();
		dialog.accept();

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Accepted);
	});

	test("accept emits accepted signal", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.accepted.connect(slot);

		dialog.exec();
		dialog.accept();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("reject closes dialog and sets rejected result", () =>
	{
		const dialog = new CDialog();

		dialog.exec();
		dialog.reject();

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Rejected);
	});

	test("reject emits rejected signal", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.rejected.connect(slot);

		dialog.exec();
		dialog.reject();

		expect(slot).toHaveBeenCalledOnce();
	});

	test("accept does nothing when dialog is closed", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.accepted.connect(slot);

		dialog.accept();

		expect(slot).not.toHaveBeenCalled();
		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Rejected);
	});

	test("reject does nothing when dialog is closed", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.rejected.connect(slot);

		dialog.reject();

		expect(slot).not.toHaveBeenCalled();
		expect(dialog.isOpen()).toBe(false);
	});

	test("escape rejects dialog", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.rejected.connect(slot);
		dialog.exec();

		const event = new CKeyEvent(
			CEventType.KeyPress,
			"Escape"
		);

		dialog.event(event);

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Rejected);
		expect(slot).toHaveBeenCalledOnce();
		expect(event.isAccepted()).toBe(true);
	});

	test("dialog can contain child widgets", () =>
	{
		const dialog = new CDialog();
		const button = new CPushButton(dialog);

		expect(button.parent()).toBe(dialog);
	});

	test("starts dragging from title bar", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			20,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseMove,
			40,
			30,
			CMouseButton.NoButton
		));

		expect(dialog.x()).toBe(120);
		expect(dialog.y()).toBe(120);
	});

	test("does not drag when press is below title bar", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			20,
			CDialog.TitleBarHeight + 10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseMove,
			40,
			60,
			CMouseButton.NoButton
		));

		expect(dialog.x()).toBe(100);
		expect(dialog.y()).toBe(100);
	});

	test("stops dragging after mouse release", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			20,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseMove,
			40,
			30,
			CMouseButton.NoButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseRelease,
			40,
			30,
			CMouseButton.LeftButton
		));

		const x = dialog.x();
		const y = dialog.y();

		dialog.event(new CMouseEvent(
			CEventType.MouseMove,
			100,
			100,
			CMouseButton.NoButton
		));

		expect(dialog.x()).toBe(x);
		expect(dialog.y()).toBe(y);
	});
});