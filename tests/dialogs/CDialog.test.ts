import { CSplashScreen } from "../../src/widgets/CSplashScreen.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CAlignment } from "../../src/core/CAlignment.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import type { CColor } from "../../src/gui/CColor.js";
import type { CPainter } from "../../src/painting/CPainter.js";
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


class PaintableSplashScreen extends CSplashScreen {
    paint(painter: CPainter): void { this.paintEvent(painter); }
}

function splashPainter() {
    const painter = { setBrush: vi.fn(), fillRect: vi.fn(), drawPixmap: vi.fn(),
        save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setFont: vi.fn(), setPen: vi.fn(),
        setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn() };
    return { painter, paint: painter as unknown as CPainter };
}

describe("CSplashScreen", () => {
    beforeEach(() => {
        const canvas = createTestCanvas(); canvas.width = 800; canvas.height = 600;
        new CApplication(canvas);
    });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function pixmap(width = 200, height = 100): CPixmap {
        return new CPixmap({} as CanvasImageSource, width, height);
    }
    test("starts hidden with no message or image", () => {
        const splash = new CSplashScreen();
        expect(splash.isVisible()).toBe(false); expect(splash.message()).toBe(""); expect(splash.pixmap()).toBeNull();
        expect(splash.width()).toBe(400); expect(splash.height()).toBe(240);
    });
    test("does not enter either rendering stack before showing", () => {
        const splash = new CSplashScreen(); const app = CApplication.instance();
        expect(app.isWindowWidget(splash)).toBe(false); expect(app.topLevelWidgets()).not.toContain(splash);
    });
    test("adopts the natural pixmap size without a title bar", () => {
        const image = pixmap(); const splash = new CSplashScreen(image);
        expect(splash.pixmap()).toBe(image); expect(splash.width()).toBe(200); expect(splash.height()).toBe(100);
        expect(splash.rect().height()).toBe(100); expect(splash.contentsRect().height()).toBe(100);
    });
    test("replacing and clearing the pixmap updates preferred size", () => {
        const splash = new CSplashScreen(pixmap()); splash.setPixmap(pixmap(300,150));
        expect(splash.sizeHint().width()).toBe(300); expect(splash.height()).toBe(150);
        splash.setPixmap(null); expect(splash.width()).toBe(400); expect(splash.pixmap()).toBeNull();
    });
    test("null-size and nonfinite pixmaps use the fallback size", () => {
        for (const image of [pixmap(0,0),pixmap(-1,10),pixmap(NaN,100),pixmap(Infinity,100)]) {
            const splash = new PaintableSplashScreen(image); expect(splash.width()).toBe(400);
            const { painter, paint }=splashPainter(); splash.paint(paint); expect(painter.drawPixmap).not.toHaveBeenCalled();
        }
    });
    test("show centers on the canvas and uses the window stack", () => {
        const splash = new CSplashScreen(pixmap()); splash.show();
        expect(splash.x()).toBe(300); expect(splash.y()).toBe(250);
        expect(CApplication.instance().isWindowWidget(splash)).toBe(true);
        expect(CApplication.instance().topLevelWidgets()).not.toContain(splash);
    });
    test("an explicitly moved splash keeps its position", () => {
        const splash=new CSplashScreen(pixmap()); splash.move(40,50); splash.show();
        expect(splash.x()).toBe(40); expect(splash.y()).toBe(50);
    });
    test("oversized images are positioned at the canvas origin", () => {
        const splash=new CSplashScreen(pixmap(1000,900)); splash.show(); expect(splash.x()).toBe(0); expect(splash.y()).toBe(0);
    });
    test("show does not take focus or create a modal scope", () => {
        const field = new CWidget(); field.setFocusPolicy(CFocusPolicy.StrongFocus); field.setFocus();
        const splash = new CSplashScreen(pixmap()); splash.show(); splash.setFocus();
        expect(splash.focusPolicy()).toBe(CFocusPolicy.NoFocus);
        expect(CApplication.instance().focusWidget()).toBe(field); expect(CApplication.instance().topModalWidget()).toBeNull();
    });
    test("hide removes the splash from the window stack", () => {
        const splash = new CSplashScreen(); splash.show(); splash.hide();
        expect(splash.isVisible()).toBe(false); expect(CApplication.instance().isWindowWidget(splash)).toBe(false);
    });
    test("setVisible shares the show and hide lifecycle", () => {
        const splash = new CSplashScreen(); splash.setVisible(true); expect(CApplication.instance().isWindowWidget(splash)).toBe(true);
        splash.setVisible(false); expect(CApplication.instance().isWindowWidget(splash)).toBe(false);
    });
    test("close can be repeated and the splash can be shown again", () => {
        const splash = new CSplashScreen(); splash.show(); splash.close(); splash.close(); splash.show();
        expect(splash.isVisible()).toBe(true); expect(CApplication.instance().isWindowWidget(splash)).toBe(true);
    });
    test("finish shows the main window and closes the splash", () => {
        const window = new CWidget(); window.hide(); const splash = new CSplashScreen(); splash.show(); splash.finish(window, 0);
        expect(window.isVisible()).toBe(true); expect(splash.isVisible()).toBe(false);
        expect(CApplication.instance().isWindowWidget(splash)).toBe(false);
    });
    test("finish does not destroy the reusable splash", () => {
        const splash=new CSplashScreen(pixmap()); splash.showMessage("Ready"); splash.show(); splash.finish(new CWidget(), 0); splash.show();
        expect(splash.isVisible()).toBe(true); expect(splash.message()).toBe("Ready");
    });
    test("destroy unregisters the window and is idempotent", () => {
        const splash = new CSplashScreen(); splash.show(); splash.destroy(); splash.destroy(); splash.show();
        expect(CApplication.instance().isWindowWidget(splash)).toBe(false); expect(splash.isVisible()).toBe(false);
    });
    test("setting a message does not show a hidden splash", () => {
        const splash=new CSplashScreen(); splash.showMessage("Loading"); expect(splash.message()).toBe("Loading");
        expect(splash.isVisible()).toBe(false);
    });
    test("messageChanged reports text changes and clearing", () => {
        const splash=new CSplashScreen(), changed=vi.fn(); splash.messageChanged.connect(changed);
        splash.showMessage("Loading"); splash.showMessage("Loading"); splash.clearMessage(); splash.clearMessage();
        expect(changed).toHaveBeenCalledTimes(2); expect(changed).toHaveBeenCalledWith("Loading"); expect(changed).toHaveBeenCalledWith("");
    });
    test("changing only alignment or color repaints without a text-change signal", () => {
        const splash=new CSplashScreen(); splash.showMessage("Loading");
        const changed=vi.fn(); splash.messageChanged.connect(changed); const update=vi.spyOn(splash,"update");
        splash.showMessage("Loading",CAlignment.Center,"#ffffff"); expect(update).toHaveBeenCalledOnce(); expect(changed).not.toHaveBeenCalled();
    });
    test("paint draws the image at its natural size", () => {
        const image=pixmap(), splash=new PaintableSplashScreen(image); const { painter,paint }=splashPainter(); splash.paint(paint);
        expect(painter.drawPixmap).toHaveBeenCalledWith(image,0,0,200,100); expect(painter.drawText).not.toHaveBeenCalled();
    });
    test("manual resizing preserves the image aspect ratio", () => {
        const image=pixmap(), splash=new PaintableSplashScreen(image); splash.resize(200,200);
        const { painter,paint }=splashPainter(); splash.paint(paint); expect(painter.drawPixmap).toHaveBeenCalledWith(image,0,50,200,100);
    });
    test("no image still paints the palette background", () => {
        const splash=new PaintableSplashScreen(); const { painter,paint }=splashPainter(); splash.paint(paint);
        expect(painter.setBrush).toHaveBeenCalledWith(splash.palette().color(CPaletteColorRole.Base).toCss());
        expect(painter.fillRect).toHaveBeenCalledOnce(); expect(painter.drawPixmap).not.toHaveBeenCalled();
    });
    test("default message alignment is bottom left", () => {
        const splash=new PaintableSplashScreen(pixmap()); splash.showMessage("Loading"); const { painter,paint }=splashPainter(); splash.paint(paint);
        expect(painter.setTextAlign).toHaveBeenCalledWith("left");
        expect(painter.drawText).toHaveBeenCalledWith("Loading",10,90-splash.fontMetrics().height());
    });
    test("top right alignment respects the inner padding", () => {
        const splash=new PaintableSplashScreen(pixmap()); splash.showMessage("Loading",CAlignment.Right|CAlignment.Top,"white");
        const { painter,paint }=splashPainter(); splash.paint(paint);
        expect(painter.setTextAlign).toHaveBeenCalledWith("right"); expect(painter.drawText).toHaveBeenCalledWith("Loading",190,10);
        expect(painter.setPen).toHaveBeenCalledWith("white"); expect(painter.restore).toHaveBeenCalledOnce();
    });
    test("centered multiline messages use one line height per line", () => {
        const splash=new PaintableSplashScreen(pixmap()); splash.showMessage("First\nSecond",CAlignment.Center);
        const { painter,paint }=splashPainter(); splash.paint(paint); const h=splash.fontMetrics().height();
        expect(painter.drawText).toHaveBeenCalledWith("First",100,50-h); expect(painter.drawText).toHaveBeenCalledWith("Second",100,50);
    });
    test("CColor-compatible message colors are converted to CSS", () => {
        const splash=new PaintableSplashScreen(); const color={toCss:()=>"rgba(1, 2, 3, 1)"} as unknown as CColor;
        splash.showMessage("Loading",CAlignment.Left,color); const { painter,paint }=splashPainter(); splash.paint(paint);
        expect(painter.setPen).toHaveBeenCalledWith("rgba(1, 2, 3, 1)");
    });
    test("clearing a message stops drawing its text", () => {
        const splash=new PaintableSplashScreen(); splash.showMessage("Loading"); splash.clearMessage();
        const { painter,paint }=splashPainter(); splash.paint(paint); expect(painter.drawText).not.toHaveBeenCalled();
    });
    test("a left click dismisses the splash", () => {
        const splash=new CSplashScreen(); splash.show(); const event=new CMouseEvent(CEventType.MousePress,10,10,CMouseButton.LeftButton);
        splash.event(event); expect(splash.isVisible()).toBe(false); expect(event.isAccepted()).toBe(true);
    });
    test("other mouse buttons leave the splash visible", () => {
        const splash=new CSplashScreen(); splash.show(); const event=new CMouseEvent(CEventType.MousePress,10,10,CMouseButton.RightButton);
        splash.event(event); expect(splash.isVisible()).toBe(true); expect(event.isAccepted()).toBe(false);
    });
    test("child coordinates have no dialog title-bar offset", () => {
        const splash=new CSplashScreen(); splash.move(20,30); const child=new CWidget(splash); child.move(3,4);
        expect(child.mapToCanvas(0,0).x()).toBe(23); expect(child.mapToCanvas(0,0).y()).toBe(34);
    });
});
