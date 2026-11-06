import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { CVBoxLayout } from "../../src/layouts/CVBoxLayout.js";
import { CStyleOptionGroupBox } from "../../src/gui/CStyleOptionGroupBox.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CRect } from "../../src/geometry/CRect.js";
import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CGroupBox } from "../../src/widgets/CGroupBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

class TestGroupBox extends CGroupBox {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CGroupBox", () => {
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

	test("has empty title by default", () => {
		const groupBox = new CGroupBox();

		expect(groupBox.title()).toBe("");
	});

	test("stores title from constructor", () => {
		const groupBox = new CGroupBox("Settings");

		expect(groupBox.title()).toBe("Settings");
	});

	test("sets title", () => {
		const groupBox = new CGroupBox();

		groupBox.setTitle("Options");

		expect(groupBox.title()).toBe("Options");
	});

	test("keeps title unchanged when setting same title", () => {
		const groupBox = new CGroupBox("Settings");

		groupBox.setTitle("Settings");

		expect(groupBox.title()).toBe("Settings");
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const groupBox = new CGroupBox("Settings", parent);

		expect(groupBox.parent()).toBe(parent);
	});

	test("can contain child widgets", () => {
		const groupBox = new CGroupBox("Settings");
		const child = new CWidget(groupBox);

		expect(child.parent()).toBe(groupBox);
		expect(groupBox.children()).toContain(child);
	});

	test("paints title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Settings",
			expect.any(Number),
			8
		);
	});

	test("paints frame sides and bottom", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0.5, 8.5, 0.5, 149.5
		);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			299.5, 8.5, 299.5, 149.5
		);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0.5, 149.5, 299.5, 149.5
		);
	});

	test("paints top-left frame segment before title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0, 8, 8, 8
		);
	});

	test("leaves gap in top frame for title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		const calls = device.engine.drawLine.mock.calls;

		const leftTop = calls.find(
			call =>
				call[0] === 0 &&
				call[1] === 8 &&
				call[2] === 8 &&
				call[3] === 8
		);

		const rightTop = calls.find(call =>
			call[0] > 8 &&
			call[2] > 290 &&
			Math.abs(call[1] - 8) <= 0.5 &&
			Math.abs(call[3] - 8) <= 0.5
		);

		expect(leftTop).toBeDefined();
		expect(rightTop).toBeDefined();

		expect(rightTop![0]).toBeGreaterThan(8);
	});

	test("paints complete frame when title is empty", () => {
		const groupBox = new TestGroupBox();
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.strokeRect).toHaveBeenCalledWith(
			0,
			8,
			300,
			142
		);

		expect(device.engine.fillText).not.toHaveBeenCalled();
	});

	test("uses widget font when painting title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalled();
	});

	test("uses widget palette when painting", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.setStrokeStyle).toHaveBeenCalled();
		expect(device.engine.setFillStyle).toHaveBeenCalled();
	});
});
describe("CGroupBox collapsing", () => {
    let group: TestGroupBox;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        new CApplication(createTestCanvas()); group = new TestGroupBox("Advanced"); group.resize(300, 180);
    });
    afterEach(() => { group.destroy(); if (CApplication.exists()) CApplication.instance().destroy(); });
    function key(name: string, type = CEventType.KeyPress): void { group.event(new CKeyEvent(type, name)); }
    function click(y = 8): void {
        group.event(new CMouseEvent(CEventType.MousePress, 12, y, CMouseButton.LeftButton));
        group.event(new CMouseEvent(CEventType.MouseRelease, 12, y, CMouseButton.LeftButton));
    }
    function child(parent: CWidget = group): CWidget { const w = new CWidget(parent); w.setGeometry(8, 40, 100, 30); w.setFocusPolicy(CFocusPolicy.StrongFocus); return w; }
    test("ordinary group boxes remain expanded and not collapsible", () => { expect(group.isCollapsible()).toBe(false); group.setCollapsed(true); expect(group.isCollapsed()).toBe(false); });
    test("collapse changes state and emits once", () => {
        group.setCollapsible(true); const changed = vi.fn(); group.collapsedChanged.connect(changed); group.setCollapsed(true); group.setCollapsed(true);
        expect(changed).toHaveBeenCalledOnce(); expect(changed).toHaveBeenCalledWith(true); expect(group.contentsRect().height()).toBe(0);
    });
    test("collapse suppresses children without losing explicit hidden state", () => {
        const visible = child(), hidden = child(); hidden.hide(); group.setCollapsible(true); group.setCollapsed(true);
        expect(visible.isVisible()).toBe(false); group.setCollapsed(false); expect(visible.isVisible()).toBe(true); expect(hidden.isVisible()).toBe(false);
    });
    test("show and hide requests made while collapsed are retained", () => {
        const visible = child(), hidden = child(); hidden.hide(); group.setCollapsible(true); group.setCollapsed(true);
        visible.hide(); hidden.show(); expect(hidden.isVisible()).toBe(false); group.setCollapsed(false); expect(visible.isVisible()).toBe(false); expect(hidden.isVisible()).toBe(true);
    });
    test("new children are suppressed immediately while collapsed", () => {
        group.setCollapsible(true); group.setCollapsed(true); const added = child(); expect(added.isVisible()).toBe(false); expect(added.canReceiveFocus()).toBe(false);
        group.setCollapsed(false); expect(added.isVisible()).toBe(true);
    });
    test("nested descendants cannot receive focus while collapsed", () => {
        const container = child(), input = child(container); group.setCollapsible(true); group.setCollapsed(true); input.setFocus(); expect(input.hasFocus()).toBe(false);
    });
    test("reparenting a child out of collapsed contents restores visibility", () => {
        const input = child(); group.setCollapsible(true); group.setCollapsed(true); input.setParent(null); expect(input.isVisible()).toBe(true); input.destroy();
    });
    test("collapsing moves focus from a descendant to the header", () => {
        const input = child(); group.setCollapsible(true); input.setFocus(); group.setCollapsed(true); expect(group.hasFocus()).toBe(true); expect(input.hasFocus()).toBe(false);
    });
    test("collapsing does not steal focus from another panel", () => {
        const other = new CWidget(); other.setFocusPolicy(CFocusPolicy.StrongFocus); other.setFocus(); group.setCollapsible(true); group.setCollapsed(true); expect(other.hasFocus()).toBe(true); other.destroy();
    });
    test("collapse releases a descendant mouse grab", () => {
        const input = child(); CApplication.instance().grabMouse(input); group.setCollapsible(true); group.setCollapsed(true); expect(CApplication.instance().mouseGrabber()).toBeNull();
    });
    test("a manually positioned box restores its previous height", () => {
        group.setCollapsible(true); group.setCollapsed(true); expect(group.height()).toBe(group.headerHeight()); group.setCollapsed(false); expect(group.height()).toBe(180);
    });
    test("collapsed sizing fixes only the vertical axis temporarily", () => {
        group.setCollapsible(true); const before = group.sizePolicy().verticalPolicy(); group.setCollapsed(true);
        expect(group.sizePolicy().verticalPolicy()).toBe(CSizePolicyType.Fixed); expect(group.sizeHint().height()).toBe(group.headerHeight());
        group.setCollapsed(false); expect(group.sizePolicy().verticalPolicy()).toBe(before);
    });
    test("disabling collapsing expands and restores the previous focus policy", () => {
        group.setCollapsible(true); group.setCollapsed(true); group.setCollapsible(false); expect(group.isCollapsed()).toBe(false); expect(group.focusPolicy()).toBe(CFocusPolicy.NoFocus);
    });
    test("click toggles only inside the title row", () => {
        group.setCollapsible(true); click(50); expect(group.isCollapsed()).toBe(false); click(); expect(group.isCollapsed()).toBe(true); click(); expect(group.isCollapsed()).toBe(false);
    });
    test("release outside the title cancels activation", () => {
        group.setCollapsible(true); group.event(new CMouseEvent(CEventType.MousePress, 10, 8, CMouseButton.LeftButton));
        group.event(new CMouseEvent(CEventType.MouseRelease, 10, 80, CMouseButton.LeftButton)); expect(group.isCollapsed()).toBe(false);
    });
    test("Space activates on release and repeated presses toggle once", () => {
        group.setCollapsible(true); key(" "); key(" "); expect(group.isCollapsed()).toBe(false); key(" ", CEventType.KeyRelease); expect(group.isCollapsed()).toBe(true);
    });
    test("Left collapses and Right expands", () => {
        group.setCollapsible(true); key("ArrowLeft"); expect(group.isCollapsed()).toBe(true); key("ArrowRight"); expect(group.isCollapsed()).toBe(false);
    });
    test("Enter toggles and Escape cancels a pending Space", () => {
        group.setCollapsible(true); key("Enter"); expect(group.isCollapsed()).toBe(true); key(" "); key("Escape"); key(" ", CEventType.KeyRelease); expect(group.isCollapsed()).toBe(true);
    });
    test("disabled header cannot toggle", () => { group.setCollapsible(true); group.setEnabled(false); click(); key("Enter"); expect(group.isCollapsed()).toBe(false); });
    test("Tab skips collapsed contents", () => {
        const root = new CWidget(); group.setParent(root); const input = child(), next = child(root); group.setCollapsible(true); group.setCollapsed(true); group.setFocus();
        CApplication.instance().focusNextWidget(); expect(next.hasFocus()).toBe(true); expect(input.hasFocus()).toBe(false); group.setParent(null); root.destroy();
    });
    test("outer layout moves following widgets when the group collapses", () => {
        const root = new CWidget(); root.resize(400, 400); group.setParent(root);
        const inside = new CVBoxLayout(); const input = child(); input.setMinimumSize(100, 60); inside.addWidget(input); group.setLayout(inside); group.setCollapsible(true);
        const next = child(root); const outer = new CVBoxLayout(); outer.addWidget(group); outer.addWidget(next); root.setLayout(outer);
        const oldY = next.y(); group.setCollapsed(true); expect(next.y()).toBeLessThan(oldY); expect(group.height()).toBe(group.headerHeight());
        group.setCollapsed(false); expect(next.y()).toBe(oldY); group.setParent(null); root.destroy();
    });
    test("manual child geometry contributes to expanded size hints", () => {
        child(); group.setCollapsible(true); expect(group.sizeHint().height()).toBe(180); group.setCollapsed(true);
        group.setCollapsed(false); expect(group.sizeHint().height()).toBe(180);
    });
    test("a larger font resizes a manually positioned collapsed header", () => {
        group.setCollapsible(true); group.setCollapsed(true);
        const spy = vi.spyOn(group.fontMetrics(), "height"); spy.mockImplementation(() => 40);
        const font = group.font(); font.setPixelSize(40); group.setFont(font);
        expect(group.height()).toBe(group.headerHeight()); spy.mockRestore();
    });
    test("noncollapsible styling retains the original title and frame geometry", () => {
        const o = new CStyleOptionGroupBox(); o.title = "Settings"; o.rect = new CRect(0, 0, 300, 150);
        const p = { setStrokeStyle: vi.fn(), setFillStyle: vi.fn(), setFont: vi.fn(), drawLine: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn() };
        new CDefaultStyle().drawGroupBox(p as unknown as CPainter, o);
        expect(p.drawText).toHaveBeenCalledWith("Settings", 12, 8);
        expect(p.drawLine).toHaveBeenCalledWith(0.5, 8.5, 0.5, 149.5);
    });
    test("style option copies collapse state and header geometry", () => {
        group.setCollapsible(true); group.setCollapsed(true); const o = new CStyleOptionGroupBox(); o.initFromGroupBox(group); const copy = new CStyleOptionGroupBox(o);
        expect(copy.collapsible).toBe(true); expect(copy.collapsed).toBe(true); expect(copy.headerHeight).toBe(group.headerHeight());
    });
    test("style paints right and down chevrons and balanced state", () => {
        const o = new CStyleOptionGroupBox(); o.collapsible = true; o.title = "Advanced"; o.headerHeight = 24; o.rect = new CRect(0, 0, 200, 100);
        const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setPen: vi.fn(), setBrush: vi.fn(), setFont: vi.fn(), setLineWidth: vi.fn(),
            fillRect: vi.fn(), strokeRect: vi.fn(), drawLine: vi.fn(), drawText: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn() };
        o.collapsed = true; new CDefaultStyle().drawGroupBox(p as unknown as CPainter, o);
        expect(p.drawLine).toHaveBeenCalledWith(12, 8, 16, 12); expect(p.drawLine).toHaveBeenCalledWith(16, 12, 12, 16);
        expect(p.save.mock.calls.length).toBe(p.restore.mock.calls.length);
        o.collapsed = false; new CDefaultStyle().drawGroupBox(p as unknown as CPainter, o);
        expect(p.drawLine).toHaveBeenCalledWith(10, 10, 14, 14); expect(p.drawLine).toHaveBeenCalledWith(14, 14, 18, 10);
    });
});
