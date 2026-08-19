import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CScrollArea } from "../../src/widgets/CScrollArea.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CWheelEvent } from "../../src/events/CWheelEvent.js";

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

		expect(area.viewport().x()).toBe(0);
		expect(area.viewport().y()).toBe(0);
		expect(area.viewport().width()).toBe(300);
		expect(area.viewport().height()).toBe(200);
	});

	test("updates viewport when geometry changes", () => {
		const area = new CScrollArea();

		area.setGeometry(50, 60, 400, 250);

		expect(area.viewport().x()).toBe(0);
		expect(area.viewport().y()).toBe(0);
		expect(area.viewport().width()).toBe(400);
		expect(area.viewport().height()).toBe(250);
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

		expect(area.horizontalScrollBar().isVisible()).toBe(false);
		expect(area.verticalScrollBar().isVisible()).toBe(false);

		expect(area.viewport().width()).toBe(300);
		expect(area.viewport().height()).toBe(200);
	});

	test("shows horizontal scroll bar when content is too wide", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 100);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(false);

		expect(area.viewport().width()).toBe(300);
		expect(area.viewport().height()).toBe(184);
	});

	test("shows vertical scroll bar when content is too tall", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().isVisible()).toBe(false);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(284);
		expect(area.viewport().height()).toBe(200);
	});

	test("shows both scroll bars when content exceeds viewport", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 400);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(284);
		expect(area.viewport().height()).toBe(184);
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
		 * Vertical scrolling is required first. Its 16 px width reduces
		 * the viewport to 284 px, which then requires horizontal scrolling.
		 */
		widget.resize(290, 300);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().isVisible()).toBe(true);
		expect(area.verticalScrollBar().isVisible()).toBe(true);

		expect(area.viewport().width()).toBe(284);
		expect(area.viewport().height()).toBe(184);
	});

	test("configures horizontal scroll bar range and page step", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 100);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().minimum()).toBe(0);
		expect(area.horizontalScrollBar().maximum()).toBe(200);
		expect(area.horizontalScrollBar().pageStep()).toBe(300);
	});

	test("configures vertical scroll bar range and page step", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(100, 500);
		area.setWidget(widget);

		expect(area.verticalScrollBar().minimum()).toBe(0);
		expect(area.verticalScrollBar().maximum()).toBe(300);
		expect(area.verticalScrollBar().pageStep()).toBe(200);
	});

	test("accounts for both scroll bars in ranges and page steps", () => {
		const area = new CScrollArea();
		const widget = new CWidget();

		area.resize(300, 200);
		widget.resize(500, 400);
		area.setWidget(widget);

		expect(area.horizontalScrollBar().maximum()).toBe(216);
		expect(area.horizontalScrollBar().pageStep()).toBe(284);

		expect(area.verticalScrollBar().maximum()).toBe(216);
		expect(area.verticalScrollBar().pageStep()).toBe(184);
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

	    expect(area.scrollY()).toBe(300);
	    expect(widget.y()).toBe(-300);
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

		expect(area.scrollY()).toBe(300);
		expect(widget.y()).toBe(-300);
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

		expect(area.scrollY()).toBe(300);
		expect(widget.y()).toBe(-300);
		expect(area.verticalScrollBar().value()).toBe(300);
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
});