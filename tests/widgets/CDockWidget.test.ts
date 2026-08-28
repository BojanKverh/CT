import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CDockWidget } from "../../src/widgets/CDockWidget.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestWidget extends CWidget {
	#m_hint: CSize;

	constructor(width: number, height: number) {
		super();

		this.#m_hint = new CSize(width, height);
	}

	override sizeHint(): CSize {
		return this.#m_hint;
	}
}

describe("CDockWidget", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("stores title from constructor", () => {
		const dock = new CDockWidget("Properties");

		expect(dock.title()).toBe("Properties");
	});

	test("has empty title by default", () => {
		const dock = new CDockWidget();

		expect(dock.title()).toBe("");
	});

	test("sets title", () => {
		const dock = new CDockWidget();

		dock.setTitle("Inspector");

		expect(dock.title()).toBe("Inspector");
	});

	test("has no content widget by default", () => {
		const dock = new CDockWidget();

		expect(dock.widget()).toBeNull();
	});

	test("sets content widget", () => {
		const dock = new CDockWidget();
		const widget = new CWidget();

		dock.setWidget(widget);

		expect(dock.widget()).toBe(widget);
		expect(widget.parent()).toBe(dock);
	});

	test("replaces content widget", () => {
		const dock = new CDockWidget();

		const first = new CWidget();
		const second = new CWidget();

		dock.setWidget(first);
		dock.setWidget(second);

		expect(dock.widget()).toBe(second);
		expect(first.parent()).toBeNull();
		expect(second.parent()).toBe(dock);
	});

	test("removes content widget", () => {
		const dock = new CDockWidget();
		const widget = new CWidget();

		dock.setWidget(widget);
		dock.setWidget(null);

		expect(dock.widget()).toBeNull();
		expect(widget.parent()).toBeNull();
	});

	test("content widget is placed below title bar", () => {
		const dock = new CDockWidget();
		const widget = new CWidget();

		dock.setGeometry(0, 0, 300, 200);
		dock.setWidget(widget);

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(
			CDockWidget.TitleBarHeight
		);

		expect(widget.width()).toBe(300);
		expect(widget.height()).toBe(
			200 - CDockWidget.TitleBarHeight
		);
	});

	test("resize updates content geometry", () => {
		const dock = new CDockWidget();
		const widget = new CWidget();

		dock.setGeometry(0, 0, 300, 200);
		dock.setWidget(widget);

		dock.resize(500, 400);

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(
			CDockWidget.TitleBarHeight
		);

		expect(widget.width()).toBe(500);
		expect(widget.height()).toBe(
			400 - CDockWidget.TitleBarHeight
		);
	});

	test("content widget height never becomes negative", () => {
		const dock = new CDockWidget();
		const widget = new CWidget();

		dock.setWidget(widget);
		dock.resize(100, 10);

		expect(widget.height()).toBe(0);
	});

	test("uses default size hint without content widget", () => {
		const dock = new CDockWidget();

		const hint = dock.sizeHint();

		expect(hint.width()).toBe(
			CDockWidget.DefaultWidth
		);

		expect(hint.height()).toBe(
			CDockWidget.DefaultHeight
		);
	});

	test("size hint includes content widget height", () => {
		const dock = new CDockWidget();
		const widget = new TestWidget(240, 150);

		dock.setWidget(widget);

		const hint = dock.sizeHint();

		expect(hint.width()).toBe(240);

		expect(hint.height()).toBe(
			150 + CDockWidget.TitleBarHeight
		);
	});

	test("size hint uses minimum default width", () => {
		const dock = new CDockWidget();
		const widget = new TestWidget(80, 100);

		dock.setWidget(widget);

		const hint = dock.sizeHint();

		expect(hint.width()).toBe(
			CDockWidget.DefaultWidth
		);
	});

	test("is closable by default", () => {
		const dock = new CDockWidget();

		expect(dock.isClosable()).toBe(true);
	});

	test("can disable closing", () => {
		const dock = new CDockWidget();

		dock.setClosable(false);

		expect(dock.isClosable()).toBe(false);
	});

    test("clicking close button hides dock widget", () => {
	    const dock = new CDockWidget();
	    dock.resize(200, 100);

	    const event = new CMouseEvent(CEventType.MousePress, 195, CDockWidget.TitleBarHeight / 2,
		    CMouseButton.LeftButton);

	    dock.event(event);
	    expect(dock.isVisible()).toBe(false);
	    expect(event.isAccepted()).toBe(true);
    });

    test("click outside close button does not hide dock widget", () => {
	    const dock = new CDockWidget();
	    dock.resize(200, 100);
	    const event = new CMouseEvent(CEventType.MousePress, 20, CDockWidget.TitleBarHeight / 2,
		    CMouseButton.LeftButton);

	    dock.event(event);
	    expect(dock.isVisible()).toBe(true);
	    expect(event.isAccepted()).toBe(false);
    });

    test("close button does nothing when dock is not closable", () => {
	    const dock = new CDockWidget();
	    dock.resize(200, 100);
	    dock.setClosable(false);

	    const event = new CMouseEvent(CEventType.MousePress, 195, CDockWidget.TitleBarHeight / 2,
		    CMouseButton.LeftButton);

	    dock.event(event);
	    expect(dock.isVisible()).toBe(true);
	    expect(event.isAccepted()).toBe(false);
    });
});