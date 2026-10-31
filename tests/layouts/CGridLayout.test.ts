import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { CSize } from "../../src/geometry/CSize.js";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CGridLayout } from "../../src/layouts/CGridLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CGridLayout", () =>
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

	test("starts empty", () =>
	{
		const layout = new CGridLayout();

		expect(layout.count()).toBe(0);
		expect(layout.rowCount()).toBe(0);
		expect(layout.columnCount()).toBe(0);
	});

	test("adds widget", () =>
	{
		const layout = new CGridLayout();
		const widget = new CWidget();

		layout.addWidget(widget, 0, 0);

		expect(layout.count()).toBe(1);
		expect(layout.widgetAt(0)).toBe(widget);
	});

	test("sets widget parent when layout has parent", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.parent()).toBe(parent);
	});

	test("sets parent of existing widget when layout is installed", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		layout.addWidget(widget, 0, 0);
		parent.setLayout(layout);

		expect(widget.parent()).toBe(parent);
	});

	test("does not add same widget twice", () =>
	{
		const layout = new CGridLayout();
		const widget = new CWidget();

		layout.addWidget(widget, 0, 0);
		layout.addWidget(widget, 1, 1);

		expect(layout.count()).toBe(1);
	});

	test("calculates row count", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 0);
		layout.addWidget(new CWidget(), 3, 0);

		expect(layout.rowCount()).toBe(4);
	});

	test("calculates column count", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 0);
		layout.addWidget(new CWidget(), 0, 4);

		expect(layout.columnCount()).toBe(5);
	});

	test("row span affects row count", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 2, 0, 3, 1);

		expect(layout.rowCount()).toBe(5);
	});

	test("column span affects column count", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 2, 1, 4);

		expect(layout.columnCount()).toBe(6);
	});

	test("rejects negative row", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), -1, 0);

		expect(layout.count()).toBe(0);
	});

	test("rejects negative column", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, -1);

		expect(layout.count()).toBe(0);
	});

	test("rejects zero row span", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 0, 0, 1);

		expect(layout.count()).toBe(0);
	});

	test("rejects zero column span", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 0, 1, 0);

		expect(layout.count()).toBe(0);
	});

	test("stores row stretch", () =>
	{
		const layout = new CGridLayout();

		layout.setRowStretch(2, 3);

		expect(layout.rowStretch(2)).toBe(3);
	});

	test("row stretch defaults to zero", () =>
	{
		const layout = new CGridLayout();

		expect(layout.rowStretch(7)).toBe(0);
	});

	test("stores column stretch", () =>
	{
		const layout = new CGridLayout();

		layout.setColumnStretch(2, 4);

		expect(layout.columnStretch(2)).toBe(4);
	});

	test("column stretch defaults to zero", () =>
	{
		const layout = new CGridLayout();

		expect(layout.columnStretch(7)).toBe(0);
	});

	test("setting row stretch to zero removes it", () =>
	{
		const layout = new CGridLayout();

		layout.setRowStretch(1, 5);
		layout.setRowStretch(1, 0);

		expect(layout.rowStretch(1)).toBe(0);
	});

	test("setting column stretch to zero removes it", () =>
	{
		const layout = new CGridLayout();

		layout.setColumnStretch(1, 5);
		layout.setColumnStretch(1, 0);

		expect(layout.columnStretch(1)).toBe(0);
	});

	test("rejects negative row stretch index", () =>
	{
		const layout = new CGridLayout();

		layout.setRowStretch(-1, 5);

		expect(layout.rowStretch(-1)).toBe(0);
	});

	test("rejects negative column stretch index", () =>
	{
		const layout = new CGridLayout();

		layout.setColumnStretch(-1, 5);

		expect(layout.columnStretch(-1)).toBe(0);
	});

	test("rejects negative row stretch", () =>
	{
		const layout = new CGridLayout();

		layout.setRowStretch(0, -1);

		expect(layout.rowStretch(0)).toBe(0);
	});

	test("rejects negative column stretch", () =>
	{
		const layout = new CGridLayout();

		layout.setColumnStretch(0, -1);

		expect(layout.columnStretch(0)).toBe(0);
	});

	test("empty sizeHint is zero", () =>
	{
		const layout = new CGridLayout();
		const size = layout.sizeHint();

		expect(size.width()).toBe(0);
		expect(size.height()).toBe(0);
	});

	test("sizeHint includes widget minimum size", () =>
	{
		const layout = new CGridLayout();
		const widget = new CWidget();

		widget.setMinimumSize(50, 30);
		layout.addWidget(widget, 0, 0);

		const size = layout.sizeHint();

		expect(size.width()).toBe(62);
		expect(size.height()).toBe(42);
	});

	test("sizeHint includes spacing between columns", () =>
	{
		const layout = new CGridLayout();
		const first = new CWidget();
		const second = new CWidget();

		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(8);

		first.setMinimumSize(20, 10);
		second.setMinimumSize(30, 10);

		layout.addWidget(first, 0, 0);
		layout.addWidget(second, 0, 1);

		const size = layout.sizeHint();

		expect(size.width()).toBe(58);
		expect(size.height()).toBe(10);
	});

	test("sizeHint includes spacing between rows", () =>
	{
		const layout = new CGridLayout();
		const first = new CWidget();
		const second = new CWidget();

		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(8);

		first.setMinimumSize(20, 10);
		second.setMinimumSize(20, 30);

		layout.addWidget(first, 0, 0);
		layout.addWidget(second, 1, 0);

		const size = layout.sizeHint();

		expect(size.width()).toBe(20);
		expect(size.height()).toBe(48);
	});

	test("lays out one widget in available space", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(100, 80);
		layout.setContentsMargins(0, 0, 0, 0);
		parent.setLayout(layout);

		layout.addWidget(widget, 0, 0);

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(0);
		expect(widget.width()).toBe(100);
		expect(widget.height()).toBe(80);
	});

	test("respects contents margins", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(100, 80);
		layout.setContentsMargins(10, 5, 20, 15);
		parent.setLayout(layout);

		layout.addWidget(widget, 0, 0);

		expect(widget.x()).toBe(10);
		expect(widget.y()).toBe(5);
		expect(widget.width()).toBe(70);
		expect(widget.height()).toBe(60);
	});

	test("lays out two columns", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(100, 40);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		expect(left.x()).toBe(0);
		expect(left.width()).toBe(50);

		expect(right.x()).toBe(50);
		expect(right.width()).toBe(50);
	});

	test("lays out two rows", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const top = new CWidget();
		const bottom = new CWidget();

		parent.resize(80, 100);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(top, 0, 0);
		layout.addWidget(bottom, 1, 0);

		expect(top.y()).toBe(0);
		expect(top.height()).toBe(50);

		expect(bottom.y()).toBe(50);
		expect(bottom.height()).toBe(50);
	});

	test("spacing separates columns", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(110, 40);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(10);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		expect(left.width()).toBe(50);
		expect(right.x()).toBe(60);
		expect(right.width()).toBe(50);
	});

	test("spacing separates rows", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const top = new CWidget();
		const bottom = new CWidget();

		parent.resize(40, 110);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(10);

		parent.setLayout(layout);

		layout.addWidget(top, 0, 0);
		layout.addWidget(bottom, 1, 0);

		expect(top.height()).toBe(50);
		expect(bottom.y()).toBe(60);
		expect(bottom.height()).toBe(50);
	});

	test("column stretch distributes extra space", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(120, 40);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		left.setMinimumSize(20, 10);
		right.setMinimumSize(20, 10);

		layout.setColumnStretch(0, 1);
		layout.setColumnStretch(1, 2);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		expect(left.width()).toBeCloseTo(46.6666667);
		expect(right.width()).toBeCloseTo(73.3333333);
	});

	test("row stretch distributes extra space", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const top = new CWidget();
		const bottom = new CWidget();

		parent.resize(40, 120);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		top.setMinimumSize(10, 20);
		bottom.setMinimumSize(10, 20);

		layout.setRowStretch(0, 1);
		layout.setRowStretch(1, 2);

		parent.setLayout(layout);

		layout.addWidget(top, 0, 0);
		layout.addWidget(bottom, 1, 0);

		expect(top.height()).toBeCloseTo(46.6666667);
		expect(bottom.height()).toBeCloseTo(73.3333333);
	});

	test("widget can span two columns", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();

		const spanning = new CWidget();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(100, 100);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(spanning, 0, 0, 1, 2);
		layout.addWidget(left, 1, 0);
		layout.addWidget(right, 1, 1);

		expect(spanning.x()).toBe(0);
		expect(spanning.width()).toBe(100);

		expect(left.width()).toBe(50);
		expect(right.x()).toBe(50);
	});

	test("widget can span two rows", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();

		const spanning = new CWidget();
		const top = new CWidget();
		const bottom = new CWidget();

		parent.resize(100, 100);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(spanning, 0, 0, 2, 1);
		layout.addWidget(top, 0, 1);
		layout.addWidget(bottom, 1, 1);

		expect(spanning.y()).toBe(0);
		expect(spanning.height()).toBe(100);

		expect(top.height()).toBe(50);
		expect(bottom.y()).toBe(50);
	});

	test("span includes internal spacing", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();

		const spanning = new CWidget();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(110, 100);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(10);

		parent.setLayout(layout);

		layout.addWidget(spanning, 0, 0, 1, 2);
		layout.addWidget(left, 1, 0);
		layout.addWidget(right, 1, 1);

		expect(spanning.width()).toBe(110);
	});

	test("respects widget maximum width", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(200, 50);
		layout.setContentsMargins(0, 0, 0, 0);

		widget.setMaximumSize(80, 100);

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.width()).toBe(80);
	});

	test("respects widget maximum height", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(50, 200);
		layout.setContentsMargins(0, 0, 0, 0);

		widget.setMaximumSize(100, 70);

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.height()).toBe(70);
	});

	test("respects widget minimum width", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(20, 40);
		layout.setContentsMargins(0, 0, 0, 0);

		widget.setMinimumSize(60, 10);

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.width()).toBe(60);
	});

	test("respects widget minimum height", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(40, 20);
		layout.setContentsMargins(0, 0, 0, 0);

		widget.setMinimumSize(10, 60);

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.height()).toBe(60);
	});

	test("redistributes space when column reaches maximum", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(200, 50);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		left.setMaximumSize(60, 100);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		expect(left.width()).toBe(60);
		expect(right.width()).toBe(140);
	});

	test("redistributes space when row reaches maximum", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const top = new CWidget();
		const bottom = new CWidget();

		parent.resize(50, 200);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		top.setMaximumSize(100, 60);

		parent.setLayout(layout);

		layout.addWidget(top, 0, 0);
		layout.addWidget(bottom, 1, 0);

		expect(top.height()).toBe(60);
		expect(bottom.height()).toBe(140);
	});

	test("changing maximum size triggers relayout", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const widget = new CWidget();

		parent.resize(200, 50);
		layout.setContentsMargins(0, 0, 0, 0);

		parent.setLayout(layout);
		layout.addWidget(widget, 0, 0);

		expect(widget.width()).toBe(200);

		widget.setMaximumSize(80, 100);

		expect(widget.width()).toBe(80);
	});

	test("changing minimum size triggers relayout", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(100, 50);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		left.setMinimumSize(80, 0);

		expect(left.width()).toBeGreaterThanOrEqual(80);
	});

	test("parent resize triggers relayout", () =>
	{
		const parent = new CWidget();
		const layout = new CGridLayout();
		const left = new CWidget();
		const right = new CWidget();

		parent.resize(100, 50);
		layout.setContentsMargins(0, 0, 0, 0);
		layout.setSpacing(0);

		parent.setLayout(layout);

		layout.addWidget(left, 0, 0);
		layout.addWidget(right, 0, 1);

		expect(left.width()).toBe(50);
		expect(right.width()).toBe(50);

		parent.resize(200, 50);

		expect(left.width()).toBe(100);
		expect(right.width()).toBe(100);
	});

	test("removeWidget removes widget from grid", () =>
	{
		const layout = new CGridLayout();
		const first = new CWidget();
		const second = new CWidget();

		layout.addWidget(first, 0, 0);
		layout.addWidget(second, 1, 1);

		layout.removeWidget(second);

		expect(layout.count()).toBe(1);
		expect(layout.widgetAt(0)).toBe(first);
	});

	test("row count updates after removing widget", () =>
	{
		const layout = new CGridLayout();
		const first = new CWidget();
		const second = new CWidget();

		layout.addWidget(first, 0, 0);
		layout.addWidget(second, 4, 0);

		expect(layout.rowCount()).toBe(5);

		layout.removeWidget(second);

		expect(layout.rowCount()).toBe(1);
	});

	test("column count updates after removing widget", () =>
	{
		const layout = new CGridLayout();
		const first = new CWidget();
		const second = new CWidget();

		layout.addWidget(first, 0, 0);
		layout.addWidget(second, 0, 4);

		expect(layout.columnCount()).toBe(5);

		layout.removeWidget(second);

		expect(layout.columnCount()).toBe(1);
	});

	test("clear removes all widgets", () =>
	{
		const layout = new CGridLayout();

		layout.addWidget(new CWidget(), 0, 0);
		layout.addWidget(new CWidget(), 1, 1);

		layout.clear();

		expect(layout.count()).toBe(0);
		expect(layout.rowCount()).toBe(0);
		expect(layout.columnCount()).toBe(0);
	});
});
describe("CGridLayout size policies", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    class PolicyHintWidget extends CWidget {
        override sizeHint(): CSize { return new CSize(50, 20); }
    }
    function setup() {
        const root = new CWidget(); root.resize(300, 200); const grid = new CGridLayout();
        grid.setContentsMargins(0, 0, 0, 0); grid.setSpacing(0); root.setLayout(grid);
        const a = new PolicyHintWidget(), b = new PolicyHintWidget();
        grid.addWidget(a, 0, 0); grid.addWidget(b, 0, 1); return { root, grid, a, b };
    }
    test("Fixed keeps its preferred size on both axes", () => {
        const { a, b } = setup(); a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(a.width()).toBe(50); expect(a.height()).toBe(20); expect(b.width()).toBe(250);
    });
    test("an expanding column receives extra space before Preferred", () => {
        const { a, b } = setup(); b.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Preferred);
        expect(a.width()).toBe(50); expect(b.width()).toBe(250);
    });
    test("capped expanding columns redistribute unused space", () => {
        const { a, b } = setup(); b.setMaximumSize(100, 500);
        b.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Preferred);
        expect(b.width()).toBe(100); expect(a.width()).toBe(200);
    });
    test("a fixed widget does not cap a growable neighbor in the same column", () => {
        const { grid, a, b } = setup(); grid.clear();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        grid.addWidget(a, 0, 0); grid.addWidget(b, 1, 0);
        expect(a.width()).toBe(50); expect(b.width()).toBe(300);
    });
    test("Minimum keeps its hint when space is scarce", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Minimum, CSizePolicyType.Preferred);
        root.resize(60, 200); expect(a.width()).toBe(50); expect(b.width()).toBe(10);
    });
    test("Maximum cannot grow beyond the hint but may shrink", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Maximum, CSizePolicyType.Preferred);
        expect(a.width()).toBe(50); expect(b.width()).toBe(250);
        root.resize(60, 200); expect(a.width()).toBe(30); expect(b.width()).toBe(30);
    });
    test("Ignored omits the hint but preserves the explicit minimum", () => {
        const { grid, a } = setup(); a.setMinimumSize(10, 5);
        a.setSizePolicy(CSizePolicyType.Ignored, CSizePolicyType.Ignored);
        expect(grid.sizeHint().width()).toBe(60); expect(grid.sizeHint().height()).toBe(20);
    });
    test("row expansion is independent of column policy", () => {
        const { grid, a, b } = setup(); grid.clear();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Expanding);
        grid.addWidget(a, 0, 0); grid.addWidget(b, 1, 0);
        expect(a.width()).toBe(50); expect(a.height()).toBe(180); expect(b.height()).toBe(20);
    });
    test("widget stretch is used when the grid has no explicit stretch", () => {
        const { a, b } = setup();
        const pa = a.sizePolicy(); pa.setHorizontalStretch(1); a.setSizePolicy(pa);
        const pb = b.sizePolicy(); pb.setHorizontalStretch(3); b.setSizePolicy(pb);
        expect(a.width()).toBe(100); expect(b.width()).toBe(200);
    });
    test("explicit column stretch takes precedence over policy stretch", () => {
        const { grid, a, b } = setup(); const policy = a.sizePolicy(); policy.setHorizontalStretch(9); a.setSizePolicy(policy);
        grid.setColumnStretch(0, 1); grid.setColumnStretch(1, 3);
        expect(a.width()).toBe(100); expect(b.width()).toBe(200);
    });
    test("explicit stretch cannot grow Fixed beyond its hint", () => {
        const { grid, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        grid.setColumnStretch(0, 5); expect(a.width()).toBe(50); expect(b.width()).toBe(250);
    });
    test("spanning Fixed widgets remain fixed as the grid grows", () => {
        const { root, grid, a, b } = setup(); grid.clear();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        grid.addWidget(a, 0, 0, 1, 2); grid.addWidget(b, 1, 0);
        root.resize(500, 300); expect(a.width()).toBe(50); expect(a.height()).toBe(20);
    });
    test("span minimum includes internal spacing exactly once", () => {
        const root = new CWidget(); const grid = new CGridLayout();
        grid.setContentsMargins(0, 0, 0, 0); grid.setSpacing(10); root.setLayout(grid);
        const a = new PolicyHintWidget(); a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        grid.addWidget(a, 0, 0, 1, 2); expect(grid.sizeHint().width()).toBe(50);
        root.resize(50, 20); expect(a.width()).toBe(50);
    });
    test("minimums win when Fixed tracks cannot fit the container", () => {
        const { root, a, b } = setup();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        b.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        root.resize(40, 10); expect(a.width()).toBe(50); expect(b.width()).toBe(50);
    });
});
