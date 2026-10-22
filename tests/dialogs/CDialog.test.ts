import { CWidget } from "../../src/widgets/CWidget.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CDialog, CDialogResult } from "../../src/dialogs/CDialog.js";
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

	test("close button rejects dialog", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.rejected.connect(slot);
		dialog.setGeometry(100, 100, 400, 250);
		dialog.exec();

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseRelease,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		expect(dialog.isOpen()).toBe(false);
		expect(dialog.result()).toBe(CDialogResult.Rejected);
		expect(slot).toHaveBeenCalledOnce();
	});

	test("pressing close button does not start dragging", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);
		dialog.exec();

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseMove,
			dialog.width() - 40,
			40,
			CMouseButton.NoButton
		));

		expect(dialog.x()).toBe(100);
		expect(dialog.y()).toBe(100);
	});

	test("clicking title bar outside close button does not close dialog", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);
		dialog.exec();

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			20,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseRelease,
			20,
			10,
			CMouseButton.LeftButton
		));

		expect(dialog.isOpen()).toBe(true);
	});

	test("release outside close button does not close dialog", () =>
	{
		const dialog = new CDialog();

		dialog.setGeometry(100, 100, 400, 250);
		dialog.exec();

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseRelease,
			200,
			100,
			CMouseButton.LeftButton
		));

		expect(dialog.isOpen()).toBe(true);
	});

	test("close button rejects only once", () =>
	{
		const dialog = new CDialog();
		const slot = vi.fn();

		dialog.rejected.connect(slot);
		dialog.setGeometry(100, 100, 400, 250);
		dialog.exec();

		dialog.event(new CMouseEvent(
			CEventType.MousePress,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		dialog.event(new CMouseEvent(
			CEventType.MouseRelease,
			dialog.width() - 10,
			10,
			CMouseButton.LeftButton
		));

		dialog.reject();

		expect(slot).toHaveBeenCalledOnce();
	});
});
describe("CDialog default buttons", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function setup() {
        const dialog = new CDialog(); dialog.setGeometry(20, 20, 300, 180);
        const button = new CPushButton(dialog); const clicked = vi.fn(); button.clicked.connect(clicked);
        button.setDefault(true); dialog.exec(); return { dialog, button, clicked };
    }
    test("has no default button until explicitly set", () => {
        const dialog = new CDialog(); new CPushButton(dialog); expect(dialog.defaultButton()).toBeNull();
    });
    test("unhandled Enter and Return activate the default once", () => {
        const { dialog, clicked } = setup();
        for (const key of ["Enter", "Return"]) {
            const event = new CKeyEvent(CEventType.KeyPress, key); dialog.event(event);
            expect(event.isAccepted()).toBe(true);
        }
        expect(clicked).toHaveBeenCalledTimes(2);
    });
    test("the default may accept the dialog", () => {
        const { dialog, button } = setup(); button.clicked.connect(() => dialog.accept());
        dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(dialog.isOpen()).toBe(false); expect(dialog.result()).toBe(CDialogResult.Accepted);
    });
    test("setting null clears the dialog default", () => {
        const { dialog, button, clicked } = setup(); dialog.setDefaultButton(null);
        expect(button.isDefault()).toBe(false); expect(dialog.defaultButton()).toBeNull();
        dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter")); expect(clicked).not.toHaveBeenCalled();
    });
    test("buttons belonging to another or nested dialog are ignored", () => {
        const { dialog, button } = setup(); const other = new CDialog(dialog); const outsider = new CPushButton(other);
        dialog.setDefaultButton(outsider); expect(dialog.defaultButton()).toBe(button);
        expect(outsider.isDefault()).toBe(false);
    });
    test("hidden or disabled defaults do not activate and do not fall back", () => {
        const { dialog, button, clicked } = setup(); const other = new CPushButton(dialog); const otherClicked = vi.fn();
        other.clicked.connect(otherClicked);
        button.hide(); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        button.show(); button.setEnabled(false); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(clicked).not.toHaveBeenCalled(); expect(otherClicked).not.toHaveBeenCalled();
        expect(dialog.defaultButton()).toBe(button);
    });
    test("a hidden or disabled containing group blocks default activation", () => {
        const { dialog, button, clicked } = setup(); const group = new CWidget(dialog); button.setParent(group);
        group.hide(); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        group.show(); group.setEnabled(false); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(clicked).not.toHaveBeenCalled();
    });
    test("closed dialogs and modified Enter do not activate the default", () => {
        const { dialog, clicked } = setup();
        for (const flags of [[true, false, false, false], [false, true, false, false],
            [false, false, true, false], [false, false, false, true]]) {
            dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter", flags[0], flags[1], flags[2], flags[3]));
        }
        dialog.close(); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(clicked).not.toHaveBeenCalled();
    });
    test("reopening preserves the configured default", () => {
        const { dialog, button, clicked } = setup(); dialog.close(); dialog.exec();
        expect(dialog.defaultButton()).toBe(button); dialog.event(new CKeyEvent(CEventType.KeyPress, "Enter"));
        expect(clicked).toHaveBeenCalledOnce();
    });
    test("Escape still rejects rather than activating the default", () => {
        const { dialog, clicked } = setup(); dialog.event(new CKeyEvent(CEventType.KeyPress, "Escape"));
        expect(clicked).not.toHaveBeenCalled(); expect(dialog.result()).toBe(CDialogResult.Rejected);
        expect(dialog.isOpen()).toBe(false);
    });
});
