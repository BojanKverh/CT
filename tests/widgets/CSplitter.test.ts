import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CSplitter } from "../../src/widgets/CSplitter.js";
import { CSplitterHandle } from "../../src/widgets/CSplitterHandle.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class HintWidget extends CWidget
{
	#m_hint: CSize;

	constructor(
		width: number,
		height: number,
		parent: CWidget | null = null
	) {
		super(parent);
		this.#m_hint = new CSize(width, height);
	}

	override sizeHint(): CSize
	{
		return new CSize(
			this.#m_hint.width(),
			this.#m_hint.height()
		);
	}
}

describe("CSplitter", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("uses horizontal orientation by default", () => {
		const splitter = new CSplitter();

		expect(splitter.orientation()).toBe(COrientation.Horizontal);
	});

	test("can be constructed with vertical orientation", () => {
		const splitter = new CSplitter(COrientation.Vertical);

		expect(splitter.orientation()).toBe(COrientation.Vertical);
	});

	test("sets orientation", () => {
		const splitter = new CSplitter();

		splitter.setOrientation(COrientation.Vertical);

		expect(splitter.orientation()).toBe(COrientation.Vertical);
	});

	test("starts empty", () => {
		const splitter = new CSplitter();

		expect(splitter.count()).toBe(0);
		expect(splitter.sizes()).toEqual([]);
	});

	test("adds widgets", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		expect(splitter.count()).toBe(2);
		expect(splitter.widget(0)).toBe(widget1);
		expect(splitter.widget(1)).toBe(widget2);
	});

	test("added widgets become children of splitter", () => {
		const splitter = new CSplitter();
		const widget = new CWidget();

		splitter.addWidget(widget);

		expect(widget.parent()).toBe(splitter);
	});

	test("returns null for invalid widget index", () => {
		const splitter = new CSplitter();

		expect(splitter.widget(-1)).toBeNull();
		expect(splitter.widget(0)).toBeNull();
		expect(splitter.widget(10)).toBeNull();
	});

	test("returns widget index", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		expect(splitter.indexOf(widget1)).toBe(0);
		expect(splitter.indexOf(widget2)).toBe(1);
	});

	test("returns -1 for widget not in splitter", () => {
		const splitter = new CSplitter();
		const widget = new CWidget();

		expect(splitter.indexOf(widget)).toBe(-1);
	});

	test("inserts widget at requested index", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		splitter.addWidget(widget1);
		splitter.addWidget(widget3);
		splitter.insertWidget(1, widget2);

		expect(splitter.count()).toBe(3);
		expect(splitter.widget(0)).toBe(widget1);
		expect(splitter.widget(1)).toBe(widget2);
		expect(splitter.widget(2)).toBe(widget3);
	});

	test("negative insert index inserts at beginning", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.addWidget(widget1);
		splitter.insertWidget(-10, widget2);

		expect(splitter.widget(0)).toBe(widget2);
		expect(splitter.widget(1)).toBe(widget1);
	});

	test("insert index above count appends widget", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.addWidget(widget1);
		splitter.insertWidget(100, widget2);

		expect(splitter.widget(0)).toBe(widget1);
		expect(splitter.widget(1)).toBe(widget2);
	});

	test("inserting existing widget moves it", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.addWidget(widget3);

		splitter.insertWidget(0, widget3);

		expect(splitter.count()).toBe(3);
		expect(splitter.widget(0)).toBe(widget3);
		expect(splitter.widget(1)).toBe(widget1);
		expect(splitter.widget(2)).toBe(widget2);
	});

	test("replaces widget", () => {
		const splitter = new CSplitter();
		const oldWidget = new CWidget();
		const newWidget = new CWidget();

		splitter.addWidget(oldWidget);

		const result = splitter.replaceWidget(0, newWidget);

		expect(result).toBe(oldWidget);
		expect(splitter.widget(0)).toBe(newWidget);
		expect(newWidget.parent()).toBe(splitter);
		expect(oldWidget.parent()).toBeNull();
	});

	test("replaceWidget returns null for invalid index", () => {
		const splitter = new CSplitter();
		const widget = new CWidget();

		expect(splitter.replaceWidget(-1, widget)).toBeNull();
		expect(splitter.replaceWidget(0, widget)).toBeNull();
	});

	test("does not replace with widget already in splitter", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		expect(splitter.replaceWidget(0, widget2)).toBeNull();
		expect(splitter.widget(0)).toBe(widget1);
		expect(splitter.widget(1)).toBe(widget2);
	});

	test("creates one handle between two widgets", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		expect(splitter.handle(0)).toBeNull();
		expect(splitter.handle(1)).toBeInstanceOf(CSplitterHandle);
	});

	test("creates handles using widget indices", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		expect(splitter.handle(0)).toBeNull();
		expect(splitter.handle(1)).toBeInstanceOf(CSplitterHandle);
		expect(splitter.handle(2)).toBeInstanceOf(CSplitterHandle);
		expect(splitter.handle(3)).toBeNull();
	});

	test("handle knows its splitter and index", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		const handle = splitter.handle(1)!;

		expect(handle.splitter()).toBe(splitter);
		expect(handle.index()).toBe(1);
	});

	test("handles use splitter orientation", () => {
		const splitter = new CSplitter(COrientation.Vertical);

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		expect(splitter.handle(1)!.orientation())
			.toBe(COrientation.Vertical);
	});

	test("changing orientation updates handles", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		splitter.setOrientation(COrientation.Vertical);

		expect(splitter.handle(1)!.orientation())
			.toBe(COrientation.Vertical);
	});

	test("uses handle width 5 by default", () => {
		const splitter = new CSplitter();

		expect(splitter.handleWidth()).toBe(5);
	});

	test("sets handle width", () => {
		const splitter = new CSplitter();

		splitter.setHandleWidth(12);

		expect(splitter.handleWidth()).toBe(12);
	});

	test("handle width cannot be negative", () => {
		const splitter = new CSplitter();

		splitter.setHandleWidth(-10);

		expect(splitter.handleWidth()).toBe(0);
	});

	test("horizontal handle geometry spans splitter height", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.setSizes([100, 300]);

		const handle = splitter.handle(1)!;

		expect(handle.x()).toBe(100);
		expect(handle.y()).toBe(0);
		expect(handle.width()).toBe(5);
		expect(handle.height()).toBe(100);
	});

	test("vertical handle geometry spans splitter width", () => {
		const splitter = new CSplitter(COrientation.Vertical);
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.resize(100, 405);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.setSizes([100, 300]);

		const handle = splitter.handle(1)!;

		expect(handle.x()).toBe(0);
		expect(handle.y()).toBe(100);
		expect(handle.width()).toBe(100);
		expect(handle.height()).toBe(5);
	});

	test("setSizes lays out horizontal widgets", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		splitter.setSizes([100, 300]);

		expect(splitter.sizes()).toEqual([100, 300]);

		expect(widget1.x()).toBe(0);
		expect(widget1.y()).toBe(0);
		expect(widget1.width()).toBe(100);
		expect(widget1.height()).toBe(100);

		expect(widget2.x()).toBe(105);
		expect(widget2.y()).toBe(0);
		expect(widget2.width()).toBe(300);
		expect(widget2.height()).toBe(100);
	});

	test("setSizes lays out vertical widgets", () => {
		const splitter = new CSplitter(COrientation.Vertical);
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		splitter.resize(100, 405);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		splitter.setSizes([100, 300]);

		expect(splitter.sizes()).toEqual([100, 300]);

		expect(widget1.x()).toBe(0);
		expect(widget1.y()).toBe(0);
		expect(widget1.width()).toBe(100);
		expect(widget1.height()).toBe(100);

		expect(widget2.x()).toBe(0);
		expect(widget2.y()).toBe(105);
		expect(widget2.width()).toBe(100);
		expect(widget2.height()).toBe(300);
	});

	test("setSizes scales values to available space", () => {
		const splitter = new CSplitter();

		splitter.resize(805, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		splitter.setSizes([100, 300]);

		expect(splitter.sizes()[0]).toBeCloseTo(200);
		expect(splitter.sizes()[1]).toBeCloseTo(600);
	});

	test("resize preserves relative sizes", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([100, 300]);

		splitter.resize(805, 100);

		expect(splitter.sizes()[0]).toBeCloseTo(200);
		expect(splitter.sizes()[1]).toBeCloseTo(600);
	});

	test("horizontal sizeHint includes handles", () => {
		const splitter = new CSplitter();
		const widget1 = new HintWidget(100, 40);
		const widget2 = new HintWidget(200, 60);

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		expect(splitter.sizeHint().width()).toBe(305);
		expect(splitter.sizeHint().height()).toBe(60);
	});

	test("vertical sizeHint includes handles", () => {
		const splitter = new CSplitter(COrientation.Vertical);
		const widget1 = new HintWidget(100, 40);
		const widget2 = new HintWidget(200, 60);

		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		expect(splitter.sizeHint().width()).toBe(200);
		expect(splitter.sizeHint().height()).toBe(105);
	});

	test("empty splitter has empty sizeHint", () => {
		const splitter = new CSplitter();

		expect(splitter.sizeHint().width()).toBe(0);
		expect(splitter.sizeHint().height()).toBe(0);
	});

	test("children are collapsible by default", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());

		expect(splitter.childrenCollapsible()).toBe(true);
		expect(splitter.isCollapsible(0)).toBe(true);
		expect(splitter.isCollapsible(1)).toBe(true);
	});

	test("sets childrenCollapsible", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.setChildrenCollapsible(false);

		expect(splitter.childrenCollapsible()).toBe(false);
		expect(splitter.isCollapsible(0)).toBe(false);
	});

	test("per-widget collapsible setting overrides global setting", () => {
		const splitter = new CSplitter();

		splitter.addWidget(new CWidget());
		splitter.setChildrenCollapsible(false);
		splitter.setCollapsible(0, true);

		expect(splitter.isCollapsible(0)).toBe(true);
	});

	test("non-collapsible widget respects minimum size", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setMinimumSize(80, 0);

		splitter.resize(205, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.setCollapsible(0, false);

		splitter.setSizes([10, 190]);

		expect(splitter.sizes()[0]).toBeGreaterThanOrEqual(80);
	});

	test("setSizes respects maximum size", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setMaximumSize(120, Number.MAX_SAFE_INTEGER);

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);

		splitter.setSizes([300, 100]);

		expect(splitter.sizes()[0]).toBeLessThanOrEqual(120);
		expect(splitter.sizes()[1]).toBeGreaterThanOrEqual(280);
	});

	test("moveSplitter moves horizontal handle", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		splitter.moveSplitter(250, 1);

		expect(splitter.sizes()).toEqual([250, 150]);
		expect(splitter.handle(1)!.x()).toBe(250);
	});

	test("moveSplitter moves vertical handle", () => {
		const splitter = new CSplitter(COrientation.Vertical);

		splitter.resize(100, 405);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		splitter.moveSplitter(250, 1);

		expect(splitter.sizes()).toEqual([250, 150]);
		expect(splitter.handle(1)!.y()).toBe(250);
	});

	test("moving handle left resizes adjacent widgets", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		splitter.moveSplitter(150, 1);

		expect(splitter.sizes()).toEqual([150, 250]);
	});

	test("moving handle respects non-collapsible minimum size", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setMinimumSize(100, 0);

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.setCollapsible(0, false);
		splitter.setSizes([200, 200]);

		splitter.moveSplitter(20, 1);

		expect(splitter.sizes()[0]).toBe(100);
		expect(splitter.handle(1)!.x()).toBe(100);
	});

	test("moving handle respects maximum size", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setMaximumSize(250, Number.MAX_SAFE_INTEGER);

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(widget2);
		splitter.setSizes([200, 200]);

		splitter.moveSplitter(350, 1);

		expect(splitter.sizes()[0]).toBe(250);
		expect(splitter.handle(1)!.x()).toBe(250);
	});

	test("closestLegalPosition returns requested legal position", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		expect(splitter.closestLegalPosition(250, 1)).toBe(250);
	});

	test("closestLegalPosition respects minimum size", () => {
		const splitter = new CSplitter();
		const widget1 = new CWidget();

		widget1.setMinimumSize(100, 0);

		splitter.resize(405, 100);
		splitter.addWidget(widget1);
		splitter.addWidget(new CWidget());
		splitter.setCollapsible(0, false);
		splitter.setSizes([200, 200]);

		expect(splitter.closestLegalPosition(20, 1)).toBe(100);
	});

	test("splitterMoved is emitted after handle movement", () => {
		const splitter = new CSplitter();
		const calls: Array<[number, number]> = [];

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		splitter.splitterMoved.connect((pos, index) => {
			calls.push([pos, index]);
		});

		splitter.moveSplitter(250, 1);

		expect(calls).toEqual([
			[250, 1]
		]);
	});

	test("splitterMoved is not emitted when handle does not move", () => {
		const splitter = new CSplitter();
		let count = 0;

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		splitter.splitterMoved.connect(() => {
			++count;
		});

		splitter.moveSplitter(200, 1);

		expect(count).toBe(0);
	});

	test("handle accepts left mouse press", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		const handle = splitter.handle(1)!;
		const event = new CMouseEvent(
			CEventType.MousePress,
			2,
			20,
			CMouseButton.LeftButton
		);

		expect(handle.event(event)).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("handle ignores non-left mouse press", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		const handle = splitter.handle(1)!;
		const event = new CMouseEvent(
			CEventType.MousePress,
			2,
			20,
			CMouseButton.RightButton
		);

		expect(handle.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("handle drag moves splitter", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		const handle = splitter.handle(1)!;

		handle.event(new CMouseEvent(
			CEventType.MousePress,
			2,
			20,
			CMouseButton.LeftButton
		));

		handle.event(new CMouseEvent(
			CEventType.MouseMove,
			52,
			20,
			CMouseButton.NoButton
		));

		expect(splitter.sizes()).toEqual([250, 150]);
	});

	test("handle does not move splitter without press", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		const handle = splitter.handle(1)!;

		handle.event(new CMouseEvent(
			CEventType.MouseMove,
			52,
			20,
			CMouseButton.NoButton
		));

		expect(splitter.sizes()).toEqual([200, 200]);
	});

	test("handle stops dragging after mouse release", () => {
		const splitter = new CSplitter();

		splitter.resize(405, 100);
		splitter.addWidget(new CWidget());
		splitter.addWidget(new CWidget());
		splitter.setSizes([200, 200]);

		const handle = splitter.handle(1)!;

		handle.event(new CMouseEvent(
			CEventType.MousePress,
			2,
			20,
			CMouseButton.LeftButton
		));

		handle.event(new CMouseEvent(
			CEventType.MouseRelease,
			2,
			20,
			CMouseButton.LeftButton
		));

		handle.event(new CMouseEvent(
			CEventType.MouseMove,
			52,
			20,
			CMouseButton.NoButton
		));

		expect(splitter.sizes()).toEqual([200, 200]);
	});
});