import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CFlowLayout } from "../../src/layouts/CFlowLayout.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CAlignment } from "../../src/core/CAlignment.js";
import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { CVBoxLayout } from "../../src/layouts/CVBoxLayout.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class HintWidget extends CWidget {
    constructor(private readonly w: number, private readonly h: number) { super(); }
    override sizeHint(): CSize { return new CSize(this.w, this.h); }
}
class WrappingWidget extends HintWidget {
    constructor() { super(100, 10); }
    override hasHeightForWidth(): boolean { return true; }
    override heightForWidth(width: number): number { return Math.ceil(100 / Math.max(1, width)) * 10; }
}

describe("CFlowLayout", () => {
    let root: CWidget, flow: CFlowLayout;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); root = new CWidget(); root.resize(200, 300);
        flow = new CFlowLayout(); flow.setContentsMargins(0, 0, 0, 0); flow.setSpacing(10); root.setLayout(flow);
    });
    afterEach(() => { root.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function add(w = 60, h = 20): HintWidget { const widget = new HintWidget(w, h); flow.addWidget(widget); return widget; }
    test("starts empty and always supports height for width", () => {
        expect(flow.count()).toBe(0); expect(flow.hasHeightForWidth()).toBe(true); expect(flow.rowCount()).toBe(0);
        expect(flow.heightForWidth(100)).toBe(0);
    });
    test("unattached layouts can measure and update", () => {
        const unattached = new CFlowLayout(); unattached.setContentsMargins(0, 0, 0, 0);
        expect(() => unattached.update()).not.toThrow(); expect(unattached.sizeHint().width()).toBe(0);
    });
    test("places preferred widths in a single row", () => {
        const a = add(), b = add(); expect(a.x()).toBe(0); expect(b.x()).toBe(70);
        expect(a.width()).toBe(60); expect(b.width()).toBe(60); expect(flow.rowCount()).toBe(1);
    });
    test("wraps the first item that does not fit", () => {
        add(); add(); add(); const fourth = add(); expect(fourth.x()).toBe(0); expect(fourth.y()).toBe(30);
        expect(flow.heightForWidth(200)).toBe(50); expect(flow.rowCount()).toBe(2);
    });
    test("an exact fit stays in the same row", () => {
        root.resize(130, 100); add(); const b = add(); expect(b.y()).toBe(0); expect(flow.rowCount()).toBe(1);
    });
    test("one pixel less causes wrapping", () => {
        root.resize(129, 100); add(); const b = add(); expect(b.y()).toBe(30); expect(flow.rowCount()).toBe(2);
    });
    test("resizing widens and narrows the row count", () => {
        add(); add(); add(); root.resize(100, 100); expect(flow.rowCount()).toBe(3);
        root.resize(300, 100); expect(flow.rowCount()).toBe(1);
    });
    test("margins affect both geometry and measurement", () => {
        flow.setContentsMargins(5, 7, 9, 11); const a = add();
        expect(a.x()).toBe(5); expect(a.y()).toBe(7); expect(flow.heightForWidth(200)).toBe(38);
        expect(flow.sizeHint().width()).toBe(74);
    });
    test("empty measurements include only margins", () => {
        flow.setContentsMargins(2, 3, 4, 5); expect(flow.sizeHint().width()).toBe(6); expect(flow.heightForWidth(0)).toBe(8);
    });
    test("rows use the tallest item and vertical gap", () => {
        add(70, 20); add(70, 40); const c = add(70, 15);
        expect(c.y()).toBe(50); expect(flow.heightForWidth(200)).toBe(65);
    });
    test("horizontal and vertical spacing are independent", () => {
        flow.setHorizontalSpacing(3); flow.setVerticalSpacing(7); root.resize(130, 100);
        add(); const b = add(); const c = add(); expect(b.x()).toBe(63); expect(c.y()).toBe(27);
    });
    test("setSpacing replaces both independent gaps", () => {
        flow.setHorizontalSpacing(2); flow.setVerticalSpacing(15); flow.setSpacing(4);
        expect(flow.horizontalSpacing()).toBe(4); expect(flow.verticalSpacing()).toBe(4);
    });
    test("normalizes spacing and rejects non-finite values", () => {
        flow.setHorizontalSpacing(-3); expect(flow.horizontalSpacing()).toBe(0);
        flow.setVerticalSpacing(7.9); expect(flow.verticalSpacing()).toBe(7);
        expect(() => flow.setSpacing(NaN)).toThrow(RangeError);
        expect(() => flow.setVerticalSpacing(Infinity)).toThrow(RangeError);
    });
    test("aligns each row to the center independently", () => {
        add(); const b = add(); const c = add(100); flow.setRowAlignment(CAlignment.HCenter);
        expect(flow.widgetAt(0)!.x()).toBe(35); expect(b.x()).toBe(105); expect(c.x()).toBe(50);
    });
    test("aligns rows to the right", () => {
        const a = add(); add(); flow.setRowAlignment(CAlignment.Right); expect(a.x()).toBe(70);
    });
    test("rejects unsupported row alignment", () => {
        expect(() => flow.setRowAlignment(CAlignment.Top)).toThrow(RangeError);
    });
    test("per-item vertical alignment works within a row", () => {
        const a = add(60, 20); add(60, 40); flow.setAlignment(a, CAlignment.Bottom);
        expect(a.y()).toBe(20); expect(a.height()).toBe(20);
        flow.setAlignment(a, CAlignment.VCenter); expect(a.y()).toBe(10);
    });
    test("hidden items consume no row space or spacing", () => {
        const a = add(), b = add(), c = add(); b.hide(); expect(c.x()).toBe(70); expect(flow.sizeHint().width()).toBe(130);
        a.hide(); expect(c.x()).toBe(0); b.show(); expect(c.x()).toBe(70);
    });
    test("removing an item reflows the remainder", () => {
        const a = add(); add(); const c = add(); flow.removeWidget(a); expect(c.x()).toBe(70); expect(flow.count()).toBe(2);
    });
    test("clear removes all managed items without destroying widgets", () => {
        const a = add(); flow.clear(); expect(flow.count()).toBe(0); expect(a.parent()).toBe(root); expect(a.isVisible()).toBe(true);
    });
    test("duplicate widgets are not inserted twice", () => {
        const a = add(); flow.addWidget(a); expect(flow.count()).toBe(1);
    });
    test("preferred size describes an unwrapped row", () => {
        add(60, 20); add(90, 30); expect(flow.sizeHint().width()).toBe(160); expect(flow.sizeHint().height()).toBe(30);
    });
    test("oversized shrinkable widgets fit the available row width", () => {
        const a = add(300, 20); expect(a.width()).toBe(200); expect(flow.rowCount()).toBe(1);
    });
    test("fixed width may overflow but never creates an empty row", () => {
        const a = add(300, 20); a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed); flow.update();
        expect(a.width()).toBe(300); expect(flow.rowCount()).toBe(1); expect(a.y()).toBe(0);
    });
    test("minimum width is respected when the container is narrower", () => {
        const a = add(300, 20); a.setMinimumSize(250, 10); flow.update(); expect(a.width()).toBe(250);
    });
    test("maximum width limits the preferred item width", () => {
        const a = add(300, 20); a.setMaximumSize(80, 40); flow.update(); expect(a.width()).toBe(80);
    });
    test("width-dependent height uses the actual allocated width", () => {
        const wrap = new WrappingWidget(); flow.addWidget(wrap); root.resize(40, 100);
        expect(wrap.width()).toBe(40); expect(wrap.height()).toBe(30); expect(flow.heightForWidth(40)).toBe(30);
    });
    test("measurement never changes current item geometry", () => {
        const a = add(), b = add(); const before = [a.x(), a.y(), a.width(), b.x(), b.y()];
        flow.heightForWidth(50); expect([a.x(), a.y(), a.width(), b.x(), b.y()]).toEqual(before);
    });
    test("empty stretch items do not create gaps or rows", () => {
        const a = add(); flow.addStretch(1); const b = add(); expect(b.x()).toBe(70); expect(flow.rowCount()).toBe(1);
        expect(a.width()).toBe(60);
    });
    test("negative and zero widths produce finite heights", () => {
        add(); add(); expect(Number.isFinite(flow.heightForWidth(-5))).toBe(true); expect(Number.isFinite(flow.heightForWidth(0))).toBe(true);
    });
    test("outer vertical layouts use flow height when arranging the next widget", () => {
        const outer = new CWidget(); outer.resize(130, 200); const box = new CVBoxLayout(); box.setContentsMargins(0, 0, 0, 0); box.setSpacing(5);
        root.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed); add(); add(); add();
        const next = new HintWidget(50, 20); next.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        box.addWidget(root); box.addWidget(next); outer.setLayout(box);
        expect(root.height()).toBe(flow.heightForWidth(root.width())); expect(next.y()).toBe(root.height() + 5);
        outer.resize(300, 200); expect(root.height()).toBe(20); expect(next.y()).toBe(25);
        root.setParent(null); outer.destroy();
    });
    test("hiding items updates the enclosing layout's height", () => {
        const outer = new CWidget(); outer.resize(130, 200); const box = new CVBoxLayout(); box.setContentsMargins(0, 0, 0, 0); box.setSpacing(5);
        root.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        add(); add(); const last = add(); const next = new HintWidget(50, 20);
        next.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        box.addWidget(root); box.addWidget(next); outer.setLayout(box);
        expect(next.y()).toBe(55); last.hide(); expect(next.y()).toBe(25);
        last.show(); expect(next.y()).toBe(55); root.setParent(null); outer.destroy();
    });
    test("row measurement agrees with actual bottom edges across widths", () => {
        flow.setContentsMargins(3, 5, 7, 9); flow.setHorizontalSpacing(4); flow.setVerticalSpacing(6);
        const widgets = [add(40, 15), add(60, 25), add(90, 18), add(30, 10)];
        for (const width of [30, 70, 100, 130, 200, 400]) {
            root.resize(width, 300);
            const bottom = Math.max(...widgets.map(w => w.y() + w.height()));
            expect(flow.heightForWidth(width)).toBe(bottom + 9);
        }
    });

});
