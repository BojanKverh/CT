import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CScrollArea } from "../../src/widgets/CScrollArea.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CWheelEvent } from "../../src/events/CWheelEvent.js";
import { CFrame } from "../../src/index.js";

describe("CScrollArea", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has a viewport", () => {
		const area = new CScrollArea();

		expect(area.viewport()).toBeInstanceOf(CWidget);
		expect(area.viewport().parent()).toBe(area);
	});

	test("has no content widget by default", () => {
		const area = new CScrollArea();

		expect(area.widget()).toBeNull();
	});

	test("sets content widget", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		const oldWidget = area.setWidget(widget);

		expect(oldWidget).toBeNull();
		expect(area.widget()).toBe(widget);
		expect(widget.parent()).toBe(area.viewport());
	});

	test("moves content widget to viewport origin", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		widget.setGeometry(50, 40, 500, 400);
		area.setWidget(widget);

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(0);
		expect(widget.width()).toBe(500);
		expect(widget.height()).toBe(400);
	});

	test("does not resize content widget", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(800, 600);

		area.setWidget(widget);

		expect(widget.width()).toBe(800);
		expect(widget.height()).toBe(600);
	});

	test("viewport fills scroll area", () => {
		const area = new CScrollArea();

		area.resize(300, 200);

		const frameWidth = area.frameWidth();

		expect(area.viewport().x()).toBe(frameWidth);
		expect(area.viewport().y()).toBe(frameWidth);
		expect(area.viewport().width()).toBe(300 - 2 * frameWidth);
		expect(area.viewport().height()).toBe(200 - 2 * frameWidth);
	});

	test("updates viewport when geometry changes", () => {
		const area = new CScrollArea();

		area.setGeometry(50, 60, 400, 250);

		const frameWidth = area.frameWidth();

		expect(area.viewport().x()).toBe(frameWidth);
		expect(area.viewport().y()).toBe(frameWidth);
		expect(area.viewport().width()).toBe(400 - 2 * frameWidth);
		expect(area.viewport().height()).toBe(250 - 2 * frameWidth);
	});

	test("replaces content widget and returns previous widget", () => {
		const area = new CScrollArea();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		expect(area.setWidget(widget1)).toBeNull();

		const oldWidget = area.setWidget(widget2);

		expect(oldWidget).toBe(widget1);
		expect(area.widget()).toBe(widget2);
		expect(widget1.parent()).toBeNull();
		expect(widget2.parent()).toBe(area.viewport());
	});

	test("setting same widget again does nothing", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.setWidget(widget);

		const oldWidget = area.setWidget(widget);

		expect(oldWidget).toBeNull();
		expect(area.widget()).toBe(widget);
		expect(widget.parent()).toBe(area.viewport());
	});

	test("replacement widget is moved to viewport origin", () => {
		const area = new CScrollArea();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget2.setGeometry(30, 40, 700, 500);

		area.setWidget(widget1);
		area.setWidget(widget2);

		expect(widget2.x()).toBe(0);
		expect(widget2.y()).toBe(0);
		expect(widget2.width()).toBe(700);
		expect(widget2.height()).toBe(500);
	});

	test("hides scroll bars when content fits viewport", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(200, 100);
		area.setWidget(widget);

		const frameWidth = area.frameWidth();

		expect(area.horizontalScrollBar().isVisible()).toBe(false);
		expect(area.verticalScrollBar().isVisible()).toBe(false);

		expect(area.viewport().width()).toBe(300 - 2 * frameWidth);
		expect(area.viewport().height()).toBe(200 - 2 * frameWidth);
	});

	test("shows horizontal scroll bar when content is too wide", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 100);
		area.setWidget(widget);

		const frameWidth = area.frameWidth();
		const scrollBarSize = area.horizontalScrollBar().height();

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(false);

		expect(area.viewport().width()).toBe(300 - 2 * frameWidth);
		expect(area.viewport().height()).toBe(
			200 - 2 * frameWidth - scrollBarSize
		);
	});

	test("shows vertical scroll bar when content is too tall", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		const frameWidth = area.frameWidth();
		const scrollBarSize = area.verticalScrollBar().width();

		expect(area.horizontalScrollBar().isVisible()).toBe(false);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(
			300 - 2 * frameWidth - scrollBarSize
		);
		expect(area.viewport().height()).toBe(200 - 2 * frameWidth);
	});

	test("shows both scroll bars when content exceeds viewport", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 400);
		area.setWidget(widget);

		const frameWidth = area.frameWidth();
		const horizontalSize = area.horizontalScrollBar().height();
		const verticalSize = area.verticalScrollBar().width();

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(
			300 - 2 * frameWidth - verticalSize
		);
		expect(area.viewport().height()).toBe(
			200 - 2 * frameWidth - horizontalSize
		);
	});

	test("horizontal scroll bar scrolls content horizontally", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 100);
		area.setWidget(widget);

		area.horizontalScrollBar().setValue(100);

		expect(area.scrollX()).toBe(100);
		expect(widget.x()).toBe(-100);
		expect(widget.y()).toBe(0);
	});

	test("vertical scroll bar scrolls content vertically", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.verticalScrollBar().setValue(100);

		expect(area.scrollY()).toBe(100);
		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(-100);
	});

	test("one scroll bar can cause the other to become necessary", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);

		/*
		 * Vertical scrolling is required first. Its width reduces
		 * the viewport enough to require horizontal scrolling.
		 */
		widget.resize(290, 300);
		area.setWidget(widget);

		const frameWidth = area.frameWidth();
		const horizontalSize = area.horizontalScrollBar().height();
		const verticalSize = area.verticalScrollBar().width();

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(
			300 - 2 * frameWidth - verticalSize
		);
		expect(area.viewport().height()).toBe(
			200 - 2 * frameWidth - horizontalSize
		);
	});

	test("configures horizontal scroll bar range and page step", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 100);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().minimum()).toBe(0);
		expect(area.horizontalScrollBar().maximum()).toBe(
			widget.width() - area.viewport().width()
		);
		expect(area.horizontalScrollBar().pageStep()).toBe(
			area.viewport().width()
		);
	});

	test("configures vertical scroll bar range and page step", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		expect(area.verticalScrollBar().minimum()).toBe(0);
		expect(area.verticalScrollBar().maximum()).toBe(
			widget.height() - area.viewport().height()
		);
		expect(area.verticalScrollBar().pageStep()).toBe(
			area.viewport().height()
		);
	});

	test("accounts for both scroll bars in ranges and page steps", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 400);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().maximum()).toBe(
			widget.width() - area.viewport().width()
		);
		expect(area.horizontalScrollBar().pageStep()).toBe(
			area.viewport().width()
		);

		expect(area.verticalScrollBar().maximum()).toBe(
			widget.height() - area.viewport().height()
		);
		expect(area.verticalScrollBar().pageStep()).toBe(
			area.viewport().height()
		);
	});

	test("scrolls vertically with wheel event", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		const event = new CWheelEvent(0, 60);

		area.event(event);

		expect(area.scrollY()).toBe(15);
		expect(widget.y()).toBe(-15);
		expect(event.isAccepted()).toBe(true);
	});

	test("clamps wheel scrolling to content", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.event(new CWheelEvent(0, 5000));

		const maximum = widget.height() - area.viewport().height();

		expect(area.scrollY()).toBe(maximum);
		expect(widget.y()).toBe(-maximum);
	});

	test("scrolls vertically with wheel event", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		const event = new CWheelEvent(0, 60);
		area.event(event);

		expect(area.scrollY()).toBe(15);
		expect(widget.y()).toBe(-15);
		expect(event.isAccepted()).toBe(true);
	});

	test("clamps wheel scrolling to content", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.event(new CWheelEvent(0, 5000));

		const maximum = widget.height() - area.viewport().height();

		expect(area.scrollY()).toBe(maximum);
		expect(widget.y()).toBe(-maximum);
	});

	test("mouse wheel scrolls content vertically", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		const event = new CWheelEvent(0, 90);
		area.event(event);

		expect(area.scrollY()).toBe(22.5);
		expect(widget.y()).toBe(-22.5);
		expect(event.isAccepted()).toBe(true);
	});

	test("mouse wheel keeps vertical scroll bar synchronized", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.event(new CWheelEvent(0, 90));

		expect(area.scrollY()).toBe(22.5);
		expect(area.verticalScrollBar().value()).toBe(22.5);
	});

	test("mouse wheel clamps scrolling at bottom", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.event(new CWheelEvent(0, 5000));

		const maximum = widget.height() - area.viewport().height();

		expect(area.scrollY()).toBe(maximum);
		expect(widget.y()).toBe(-maximum);
		expect(area.verticalScrollBar().value()).toBe(maximum);
	});

	test("mouse wheel clamps scrolling at top", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		area.scrollTo(0, 200);
		area.event(new CWheelEvent(0, -5000));

		expect(area.scrollY()).toBe(0);
		expect(widget.y()).toBe(0);
		expect(area.verticalScrollBar().value()).toBe(0);
	});

	test("ignores mouse wheel when vertical scrolling is not available", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 100);
		area.setWidget(widget);

		const event = new CWheelEvent(0, 90);
		area.event(event);

		expect(area.scrollY()).toBe(0);
		expect(widget.y()).toBe(0);
		expect(event.isAccepted()).toBe(false);
	});

	test("inherits CFrame", () => {
		const scrollArea = new CScrollArea();

		expect(scrollArea).toBeInstanceOf(CFrame);
	});
});
import { CImageView } from "../../src/widgets/CImageView.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { vi } from "vitest";

describe("CImageView", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function image(w = 800, h = 400): CPixmap { return new CPixmap({} as CanvasImageSource, w, h); }
    function viewer(w = 402, h = 302): CImageView {
        const view = new CImageView(); view.resize(w, h); view.setPixmap(image()); return view;
    }
    function mouse(view: CImageView, type: CEventType, x: number, y: number, button = CMouseButton.LeftButton): CMouseEvent {
        const e = new CMouseEvent(type, x, y, button); view.event(e); return e;
    }
    test("starts empty with fit mode and checkerboard enabled", () => {
        const view = new CImageView(); expect(view.pixmap()).toBeNull(); expect(view.zoomFactor()).toBe(1);
        expect(view.isFitToWindow()).toBe(true); expect(view.checkerboardVisible()).toBe(true);
    });
    test("fits an image without scrollbars", () => {
        const view = viewer(); expect(view.zoomFactor()).toBeCloseTo(0.5);
        expect(view.horizontalScrollBar().isVisible()).toBe(false); expect(view.verticalScrollBar().isVisible()).toBe(false);
        expect(view.imageRect().width()).toBe(400); expect(view.imageRect().y()).toBe(50);
    });
    test("fit mode follows viewport resizing", () => {
        const view = viewer(); view.resize(202, 102); expect(view.zoomFactor()).toBeCloseTo(0.25);
        expect(view.imageRect().height()).toBe(100);
    });
    test("actual size exposes both scrollbars", () => {
        const view = viewer(); view.actualSize(); expect(view.zoomFactor()).toBe(1); expect(view.isFitToWindow()).toBe(false);
        expect(view.horizontalScrollBar().isVisible()).toBe(true); expect(view.verticalScrollBar().isVisible()).toBe(true);
    });
    test("manual zoom survives resize", () => {
        const view = viewer(); view.setZoomFactor(2); view.resize(300, 200); expect(view.zoomFactor()).toBe(2);
    });
    test("fit can enlarge a small image", () => {
        const view = viewer(); view.setPixmap(image(100, 50)); expect(view.zoomFactor()).toBe(4);
        view.actualSize(); expect(view.imageRect().x()).toBe(150); expect(view.imageRect().y()).toBe(125);
    });
    test("manual zoom preserves the image coordinate under its anchor", () => {
        const view = viewer(); view.actualSize(); view.scrollTo(100, 50);
        const anchor = new CPoint(100, 80); const x = view.scrollX() + 100, y = view.scrollY() + 80;
        view.setZoomFactor(2, anchor);
        expect((view.scrollX() + 100) / 2).toBeCloseTo(x); expect((view.scrollY() + 80) / 2).toBeCloseTo(y);
    });
    test("wheel up zooms around its widget-relative position", () => {
        const view = viewer(); view.actualSize(); view.scrollTo(100, 50);
        const beforeX = view.scrollX() + 70, beforeY = view.scrollY() + 90;
        const e = new CWheelEvent(0, -100, view.viewport().x() + 70, view.viewport().y() + 90);
        view.event(e); expect(e.isAccepted()).toBe(true); expect(view.zoomFactor()).toBeGreaterThan(1);
        expect((view.scrollX() + 70) / view.zoomFactor()).toBeCloseTo(beforeX);
        expect((view.scrollY() + 90) / view.zoomFactor()).toBeCloseTo(beforeY);
    });
    test("legacy wheel events zoom around the viewport centre", () => {
        const view = viewer(); view.actualSize(); view.event(new CWheelEvent(0, 100)); expect(view.zoomFactor()).toBeLessThan(1);
    });
    test("empty and horizontal-only wheel events are ignored", () => {
        const view = new CImageView(); const e = new CWheelEvent(0, -100); view.event(e); expect(e.isAccepted()).toBe(false);
        view.setPixmap(image()); const h = new CWheelEvent(100, 0); view.event(h); expect(h.isAccepted()).toBe(false);
    });
    test("zoom is clamped and invalid inputs are ignored", () => {
        const view = viewer(); view.setZoomFactor(Infinity); view.setZoomFactor(NaN); view.setZoomFactor(0);
        expect(view.zoomFactor()).toBe(0.5); view.setZoomFactor(1000); expect(view.zoomFactor()).toBe(CImageView.MaximumZoom);
        view.setZoomFactor(1e-10); expect(view.zoomFactor()).toBe(CImageView.MinimumZoom);
    });
    test("zoomChanged reports actual magnification changes", () => {
        const view = viewer(); const changed = vi.fn(); view.zoomChanged.connect(changed);
        view.setZoomFactor(1); view.setZoomFactor(1); expect(changed).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenCalledWith(1);
    });
    test("dragging pans and release ends the drag", () => {
        const view = viewer(); view.actualSize(); view.scrollTo(150, 90);
        mouse(view, CEventType.MousePress, 100, 100); mouse(view, CEventType.MouseMove, 70, 80);
        expect(view.scrollX()).toBe(180); expect(view.scrollY()).toBe(110);
        mouse(view, CEventType.MouseRelease, 70, 80); mouse(view, CEventType.MouseMove, 10, 10);
        expect(view.scrollX()).toBe(180);
    });
    test("panning clamps at the image edges", () => {
        const view = viewer(); view.actualSize(); mouse(view, CEventType.MousePress, 100, 100);
        mouse(view, CEventType.MouseMove, 1000, 1000); expect(view.scrollX()).toBe(0); expect(view.scrollY()).toBe(0);
    });
    test("right click does not begin a drag", () => {
        const view = viewer(); const e = mouse(view, CEventType.MousePress, 10, 10, CMouseButton.RightButton);
        expect(e.isAccepted()).toBe(false);
    });
    test("hiding and disabling terminate dragging", () => {
        const view = viewer(); view.actualSize(); mouse(view, CEventType.MousePress, 100, 100); view.hide(); view.show();
        expect(mouse(view, CEventType.MouseMove, 50, 50).isAccepted()).toBe(false);
        mouse(view, CEventType.MousePress, 100, 100); view.setEnabled(false); view.setEnabled(true);
        expect(mouse(view, CEventType.MouseMove, 50, 50).isAccepted()).toBe(false);
    });
    test("double click toggles fit and actual size", () => {
        const view = viewer(); mouse(view, CEventType.MouseDoubleClick, 100, 100); expect(view.zoomFactor()).toBe(1);
        mouse(view, CEventType.MouseDoubleClick, 100, 100); expect(view.isFitToWindow()).toBe(true); expect(view.zoomFactor()).toBe(0.5);
    });
    test("keyboard controls zoom, fit and pan", () => {
        const view = viewer(); view.event(new CKeyEvent(CEventType.KeyPress, "0")); expect(view.zoomFactor()).toBe(1);
        view.event(new CKeyEvent(CEventType.KeyPress, "+")); expect(view.zoomFactor()).toBe(1.25);
        view.event(new CKeyEvent(CEventType.KeyPress, "-")); expect(view.zoomFactor()).toBe(1);
        view.scrollTo(0, 0); view.event(new CKeyEvent(CEventType.KeyPress, "ArrowRight")); expect(view.scrollX()).toBe(32);
        view.event(new CKeyEvent(CEventType.KeyPress, "f")); expect(view.isFitToWindow()).toBe(true);
    });
    test("clearing removes the image and scrollbars", () => {
        const view = viewer(); view.actualSize(); view.clear(); expect(view.pixmap()).toBeNull(); expect(view.scrollX()).toBe(0);
        expect(view.horizontalScrollBar().isVisible()).toBe(false); expect(view.verticalScrollBar().isVisible()).toBe(false);
    });
    test("invalid pixmaps clear the viewer", () => {
        const view = viewer(); for (const width of [0, -1, NaN, Infinity]) { view.setPixmap(image(width)); expect(view.pixmap()).toBeNull(); }
    });
    test("new images reset manual zoom to fit", () => {
        const view = viewer(); view.setZoomFactor(2); view.setPixmap(image(400, 200)); expect(view.isFitToWindow()).toBe(true); expect(view.zoomFactor()).toBe(1);
    });
    test("wheel positions are optional and returned as copies", () => {
        expect(new CWheelEvent(1, 2).pos()).toBeNull(); const e = new CWheelEvent(1, 2, 10, 20);
        expect(e.pos()!.x()).toBe(10); expect(e.pos()!.y()).toBe(20); expect(e.pos()).not.toBe(e.pos());
    });
    test("painting draws the image with checkerboard confined to visible tiles", () => {
        const view = viewer(); view.setZoomFactor(64); view.scrollTo(1000, 1000);
        const painter = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), clipRect: vi.fn(),
            setBrush: vi.fn(), fillRect: vi.fn(), drawPixmap: vi.fn() };
        view.widget()!.render(painter as unknown as CPainter);
        expect(painter.drawPixmap).toHaveBeenCalledWith(view.pixmap(), 0, 0, 51200, 25600);
        expect(painter.fillRect.mock.calls.length).toBeLessThan(1500);
        expect(painter.setBrush).toHaveBeenCalledWith("#d9d9d9");
    });
    test("checkerboard can be disabled without suppressing the image", () => {
        const view = viewer(); view.setCheckerboardVisible(false);
        const painter = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), clipRect: vi.fn(),
            setBrush: vi.fn(), fillRect: vi.fn(), drawPixmap: vi.fn() };
        view.widget()!.render(painter as unknown as CPainter);
        expect(painter.drawPixmap).toHaveBeenCalledTimes(1); expect(painter.fillRect).toHaveBeenCalledTimes(1);
    });
});
