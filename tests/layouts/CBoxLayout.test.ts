import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CBoxLayout,
	CBoxLayoutDirection
} from "../../src/layouts/CBoxLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CSize } from "../../src/geometry/CSize.js"

class HintWidget extends CWidget {
	constructor(
		private readonly hintWidth: number,
		private readonly hintHeight: number
	) {
		super();
	}

	override sizeHint(): CSize {
		return new CSize(this.hintWidth, this.hintHeight);
	}
}

describe("CBoxLayout", () => {
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

	test("stores layout direction", () => {
		const horizontal = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		const vertical = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		expect(horizontal.direction()).toBe(
			CBoxLayoutDirection.LeftToRight
		);
		expect(vertical.direction()).toBe(
			CBoxLayoutDirection.TopToBottom
		);
	});

	test("does nothing without parent widget", () => {
		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		const widget = new CWidget();
		layout.addWidget(widget);

		expect(() => layout.update()).not.toThrow();
	});

	test("does nothing with empty layout", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		expect(() => layout.update()).not.toThrow();
	});

	test("lays out widgets horizontally", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.geometry().x()).toBe(0);
		expect(widget1.geometry().y()).toBe(0);
		expect(widget1.geometry().width()).toBe(100);
		expect(widget1.geometry().height()).toBe(100);

		expect(widget2.geometry().x()).toBe(100);
		expect(widget2.geometry().y()).toBe(0);
		expect(widget2.geometry().width()).toBe(100);
		expect(widget2.geometry().height()).toBe(100);

		expect(widget3.geometry().x()).toBe(200);
		expect(widget3.geometry().y()).toBe(0);
		expect(widget3.geometry().width()).toBe(100);
		expect(widget3.geometry().height()).toBe(100);
	});

	test("lays out widgets vertically", () => {
		const parent = new CWidget();
		parent.resize(100, 300);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.geometry().x()).toBe(0);
		expect(widget1.geometry().y()).toBe(0);
		expect(widget1.geometry().width()).toBe(100);
		expect(widget1.geometry().height()).toBe(100);

		expect(widget2.geometry().x()).toBe(0);
		expect(widget2.geometry().y()).toBe(100);
		expect(widget2.geometry().width()).toBe(100);
		expect(widget2.geometry().height()).toBe(100);

		expect(widget3.geometry().x()).toBe(0);
		expect(widget3.geometry().y()).toBe(200);
		expect(widget3.geometry().width()).toBe(100);
		expect(widget3.geometry().height()).toBe(100);
	});

	test("applies spacing horizontally", () => {
		const parent = new CWidget();
		parent.resize(320, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);
		layout.setSpacing(10);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.geometry().x()).toBe(0);
		expect(widget1.geometry().width()).toBe(100);

		expect(widget2.geometry().x()).toBe(110);
		expect(widget2.geometry().width()).toBe(100);

		expect(widget3.geometry().x()).toBe(220);
		expect(widget3.geometry().width()).toBe(100);
	});

	test("applies spacing vertically", () => {
		const parent = new CWidget();
		parent.resize(100, 320);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);
		layout.setSpacing(10);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.geometry().y()).toBe(0);
		expect(widget1.geometry().height()).toBe(100);

		expect(widget2.geometry().y()).toBe(110);
		expect(widget2.geometry().height()).toBe(100);

		expect(widget3.geometry().y()).toBe(220);
		expect(widget3.geometry().height()).toBe(100);
	});

	test("relayouts widgets when spacing changes", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		layout.setSpacing(20);

		expect(widget1.geometry().width()).toBe(140);
		expect(widget2.geometry().x()).toBe(160);
		expect(widget2.geometry().width()).toBe(140);
	});

	test("relayouts widgets when parent is resized", () => {
		const parent = new CWidget();
		parent.resize(200, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.geometry().width()).toBe(100);
		expect(widget2.geometry().x()).toBe(100);

		parent.resize(400, 100);

		expect(widget1.geometry().width()).toBe(200);
		expect(widget2.geometry().x()).toBe(200);
		expect(widget2.geometry().width()).toBe(200);
	});

	test("supports fractional widget sizes", () => {
		const parent = new CWidget();
		parent.resize(100, 40);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		expect(widget1.geometry().width()).toBeCloseTo(100 / 3);
		expect(widget2.geometry().x()).toBeCloseTo(100 / 3);
		expect(widget3.geometry().x()).toBeCloseTo(200 / 3);
	});

	test("applies spacing inside contents margins", () => {
		const parent = new CWidget();
		parent.resize(340, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setContentsMargins(10, 10, 10, 10);
		layout.setSpacing(20);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.x()).toBe(10);
		expect(widget1.width()).toBe(150);

		expect(widget2.x()).toBe(180);
		expect(widget2.width()).toBe(150);

		expect(widget1.y()).toBe(10);
		expect(widget1.height()).toBe(80);

		expect(widget2.y()).toBe(10);
		expect(widget2.height()).toBe(80);
	});

	test("applies horizontal stretch factors", () => {
		const parent = new CWidget();
		parent.resize(400, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		expect(widget1.x()).toBe(0);
		expect(widget1.width()).toBe(100);

		expect(widget2.x()).toBe(100);
		expect(widget2.width()).toBe(200);

		expect(widget3.x()).toBe(300);
		expect(widget3.width()).toBe(100);
	});

	test("applies vertical stretch factors", () => {
		const parent = new CWidget();
		parent.resize(100, 400);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		expect(widget1.y()).toBe(0);
		expect(widget1.height()).toBe(100);

		expect(widget2.y()).toBe(100);
		expect(widget2.height()).toBe(200);

		expect(widget3.y()).toBe(300);
		expect(widget3.height()).toBe(100);
	});

	test("uses equal sizes when stretch is zero", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 0);
		layout.addWidget(widget2, 0);
		layout.addWidget(widget3, 0);

		expect(widget1.width()).toBe(100);
		expect(widget2.width()).toBe(100);
		expect(widget3.width()).toBe(100);
	});

	test("combines stretch factors with spacing", () => {
		const parent = new CWidget();
		parent.resize(420, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setSpacing(10);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		expect(widget1.width()).toBe(100);
		expect(widget1.x()).toBe(0);

		expect(widget2.width()).toBe(200);
		expect(widget2.x()).toBe(110);

		expect(widget3.width()).toBe(100);
		expect(widget3.x()).toBe(320);
	});

	test("combines stretch factors with contents margins", () => {
		const parent = new CWidget();
		parent.resize(440, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setContentsMargins(20, 10, 20, 10);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		expect(widget1.x()).toBe(20);
		expect(widget1.width()).toBe(100);

		expect(widget2.x()).toBe(120);
		expect(widget2.width()).toBe(200);

		expect(widget3.x()).toBe(320);
		expect(widget3.width()).toBe(100);

		expect(widget1.y()).toBe(10);
		expect(widget1.height()).toBe(80);
	});

    test("uses preferred sizes and distributes extra space by stretch", () => {
	    const parent = new CWidget();
	    parent.resize(500, 100);
    	const layout = new CBoxLayout(
	    	CBoxLayoutDirection.LeftToRight
	    );

    	parent.setLayout(layout);
    	const widget1 = new HintWidget(100, 40);
	    const widget2 = new HintWidget(150, 40);
    	layout.addWidget(widget1, 1);
	    layout.addWidget(widget2, 2);
    	expect(widget1.width()).toBeCloseTo(183.333333);
	    expect(widget2.width()).toBeCloseTo(316.666667);
    	expect(widget1.x()).toBe(0);
	    expect(widget2.x()).toBeCloseTo(183.333333);
    });

    test("shrinks preferred sizes toward minimum sizes", () => {
	    const parent = new CWidget();
	    parent.resize(200, 100);
	    const layout = new CBoxLayout(
		    CBoxLayoutDirection.LeftToRight
	    );
    	parent.setLayout(layout);
    	const widget1 = new HintWidget(100, 40);
	    const widget2 = new HintWidget(150, 40);
    	widget1.setMinimumSize(50, 0);
	    widget2.setMinimumSize(80, 0);
    	layout.addWidget(widget1);
	    layout.addWidget(widget2);
    	expect(widget1.width()).toBeCloseTo(79.166667);
        expect(widget2.width()).toBeCloseTo(120.833333);
    	expect(widget1.width()).toBeGreaterThanOrEqual(50);
	    expect(widget2.width()).toBeGreaterThanOrEqual(80);
    });
});