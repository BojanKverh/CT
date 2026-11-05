import { CShortcut } from "../../src/core/CShortcut.js";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { CLoadingOverlay } from "../../src/widgets/CLoadingOverlay.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CAnimationDriver } from "../../src/animation/CAnimationDriver.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import type { CPainter } from "../../src/painting/CPainter.js";

class Field extends CWidget {
    presses = 0; keys = 0;
    constructor(parent: CWidget) { super(parent); this.setFocusPolicy(CFocusPolicy.StrongFocus); this.setGeometry(5, 5, 80, 30); }
    protected override mousePressEvent(event: CMouseEvent): void { this.presses++; event.accept(); }
    protected override keyPressEvent(event: CKeyEvent): void { this.keys++; event.accept(); }
}
class OffsetPanel extends CWidget { protected override childOffset(): CPoint { return new CPoint(-20, -30); } }

describe("CLoadingOverlay", () => {
    let root: CWidget, target: CWidget, field: Field, other: Field, overlay: CLoadingOverlay;
    let restoreDriver: () => void;
    let oldWindow: PropertyDescriptor | undefined;
    let listeners: Map<string, (event: unknown) => void>;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        listeners = new Map();
        Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {
            addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
            removeEventListener: (type: string) => listeners.delete(type)
        } });
        new CApplication(createTestCanvas());
        const driver = vi.spyOn(CAnimationDriver, "add"); driver.mockImplementation(() => () => {}); restoreDriver = () => driver.mockRestore();
        root = new CWidget(); root.resize(700, 400); target = new CWidget(root); target.setGeometry(10, 10, 300, 200);
        field = new Field(target); other = new Field(root); other.move(400, 10); overlay = new CLoadingOverlay(target);
    });
    afterEach(() => { root.destroy(); restoreDriver(); if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow === undefined) Reflect.deleteProperty(globalThis, "window");
        else Object.defineProperty(globalThis, "window", oldWindow);
    });
    function press(): CMouseEvent { return new CMouseEvent(CEventType.MousePress, 10, 10, CMouseButton.LeftButton); }
    test("starts hidden and does not block the target", () => {
        expect(overlay.isLoading()).toBe(false); expect(target.inputBlocker()).toBeNull(); expect(overlay.indicator().isRunning()).toBe(false);
    });
    test("start covers the target and starts the indicator", () => {
        overlay.start("Fetching…"); expect(overlay.message()).toBe("Fetching…"); expect(overlay.isLoading()).toBe(true);
        expect(overlay.width()).toBe(300); expect(overlay.height()).toBe(200); expect(overlay.indicator().isAnimating()).toBe(true);
    });
    test("target resize immediately resizes the overlay", () => {
        overlay.start(); target.resize(480, 260); expect(overlay.width()).toBe(480); expect(overlay.height()).toBe(260);
    });
    test("stopping releases the shield and stops the indicator", () => {
        overlay.start(); overlay.stop(); expect(target.inputBlocker()).toBeNull(); expect(overlay.indicator().isAnimating()).toBe(false);
    });
    test("show and hide use the same loading lifecycle", () => {
        overlay.show(); expect(target.inputBlocker()).toBe(overlay); overlay.hide(); expect(target.inputBlocker()).toBeNull();
    });
    test("setVisible also controls blocking", () => {
        overlay.setVisible(true); expect(field.inputBlocker()).toBe(overlay); overlay.setVisible(false); expect(field.inputBlocker()).toBeNull();
    });
    test("repeated start and stop are harmless", () => { overlay.start(); overlay.start(); overlay.stop(); overlay.stop(); expect(target.inputBlocker()).toBeNull(); });
    test("blocked controls receive no mouse or key handlers", () => {
        overlay.start(); field.event(press()); field.event(new CKeyEvent(CEventType.KeyPress, "a")); expect(field.presses).toBe(0); expect(field.keys).toBe(0);
    });
    test("other panels remain usable", () => {
        overlay.start(); other.event(press()); other.event(new CKeyEvent(CEventType.KeyPress, "a")); expect(other.presses).toBe(1); expect(other.keys).toBe(1);
    });
    test("prior focus inside the panel transfers to the overlay", () => {
        field.setFocus(); overlay.start(); expect(overlay.hasFocus()).toBe(true); expect(field.canReceiveFocus()).toBe(false);
    });
    test("programmatic focus cannot enter blocked content", () => {
        overlay.start(); other.setFocus(); field.setFocus(); expect(other.hasFocus()).toBe(true);
        CApplication.instance().setFocusWidget(field); expect(overlay.hasFocus()).toBe(true);
    });
    test("stop restores the prior focus when still on the overlay", () => {
        field.setFocus(); overlay.start(); overlay.stop(); expect(field.hasFocus()).toBe(true);
    });
    test("stop does not steal focus back from another panel", () => {
        field.setFocus(); overlay.start(); other.setFocus(); overlay.stop(); expect(other.hasFocus()).toBe(true);
    });
    test("opening does not steal focus from an unrelated panel", () => {
        other.setFocus(); overlay.start(); expect(other.hasFocus()).toBe(true);
    });
    test("Tab traversal excludes blocked controls and includes other panels", () => {
        field.setFocus(); overlay.start(); CApplication.instance().focusNextWidget(); expect(other.hasFocus()).toBe(true);
    });
    test("Tab bubbles through both the overlay and blocked container", () => {
        overlay.start(); const key = new CKeyEvent(CEventType.KeyPress, "Tab");
        expect(overlay.event(key)).toBe(false); expect(target.event(key)).toBe(false);
    });
    test("Enter is consumed rather than activating a parent default button", () => {
        overlay.start(); const key = new CKeyEvent(CEventType.KeyPress, "Enter"); expect(overlay.event(key)).toBe(true);
    });
    test("restoration skips a destroyed field", () => {
        field.setFocus(); overlay.start(); field.destroy(); overlay.stop(); expect(CApplication.instance().focusWidget()).toBeNull();
    });
    test("existing mouse grabs inside the target are released", () => {
        CApplication.instance().grabMouse(field); overlay.start(); expect(CApplication.instance().mouseGrabber()).toBeNull();
    });
    test("unrelated mouse grabs are preserved", () => {
        CApplication.instance().grabMouse(other); overlay.start(); expect(CApplication.instance().mouseGrabber()).toBe(other);
    });
    test("hit testing prioritizes overlay over children added later", () => {
        overlay.start(); const later = new Field(target); const hit = target.widgetAt(10, 10);
        expect(hit).toBe(overlay); expect(later.inputBlocker()).toBe(overlay);
    });
    test("overlay subtree remains interactive and focusable", () => {
        overlay.start(); expect(overlay.inputBlocker()).toBeNull(); expect(overlay.indicator().inputBlocker()).toBeNull();
        expect(overlay.canReceiveFocus()).toBe(true);
    });
    test("scrolling child offsets do not move the overlay", () => {
        const panel = new OffsetPanel(root); panel.resize(300, 200); const shield = new CLoadingOverlay(panel); shield.start();
        expect(panel.widgetAt(290, 190)).toBe(shield); shield.stop(); panel.destroy();
    });
    test("hiding an ancestor suspends the spinner", () => {
        overlay.start(); target.hide(); expect(overlay.indicator().isAnimating()).toBe(false); target.show(); expect(overlay.indicator().isAnimating()).toBe(true);
    });
    test("a second active overlay is rejected without becoming visible", () => {
        overlay.start(); const second = new CLoadingOverlay(target);
        expect(() => second.start()).toThrow(Error); expect(second.isVisible()).toBe(false); second.destroy();
        expect(target.inputBlocker()).toBe(overlay);
    });
    test("destroy releases blocking and restores focus", () => {
        field.setFocus(); overlay.start(); overlay.destroy(); expect(target.inputBlocker()).toBeNull(); expect(field.hasFocus()).toBe(true);
    });
    test("destroying the target cleans up a running overlay", () => {
        overlay.start(); target.destroy(); expect(overlay.indicator().isAnimating()).toBe(false);
    });
    test("opacity is clamped and non-finite input rejected", () => {
        overlay.setOverlayOpacity(2); expect(overlay.overlayOpacity()).toBe(1); overlay.setOverlayOpacity(-1); expect(overlay.overlayOpacity()).toBe(0);
        expect(() => overlay.setOverlayOpacity(NaN)).toThrow(RangeError);
    });
    test("shield is rendered after later ordinary children", () => {
        overlay.start(); const later = new Field(target); const order: string[] = [];
        const a = vi.spyOn(overlay, "render"); a.mockImplementation(() => { order.push("overlay"); });
        const b = vi.spyOn(later, "render"); b.mockImplementation(() => { order.push("later"); });
        const p = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), clipRect: vi.fn() };
        try { target.render(p as unknown as CPainter); expect(order).toEqual(["later", "overlay"]); }
        finally { a.mockRestore(); b.mockRestore(); }
    });
    function dispatchKey(key: string, ctrlKey = false): void {
        listeners.get("keydown")!({ key, ctrlKey, shiftKey: false, altKey: false, metaKey: false,
            code: "", target: null, preventDefault: vi.fn(), getModifierState: () => false });
    }
    test("application Tab routing leaves the overlay for an unblocked panel", () => {
        field.setFocus(); overlay.start(); dispatchKey("Tab"); expect(other.hasFocus()).toBe(true);
    });
    test("application key routing cannot edit the formerly focused field", () => {
        field.setFocus(); overlay.start(); dispatchKey("a"); expect(field.keys).toBe(0);
    });
    test("shortcuts scoped to a blocked panel do not activate", () => {
        const shortcut = new CShortcut("Ctrl+K", target); const activated = vi.fn(); shortcut.activated.connect(activated);
        field.setFocus(); overlay.start(); dispatchKey("k", true); expect(activated).not.toHaveBeenCalled(); shortcut.destroy();
    });
    test("shortcuts scoped to the other panel remain usable", () => {
        const shortcut = new CShortcut("Ctrl+K", other); const activated = vi.fn(); shortcut.activated.connect(activated);
        overlay.start(); other.setFocus(); dispatchKey("k", true); expect(activated).toHaveBeenCalledOnce(); shortcut.destroy();
    });
    test("clipboard routing cannot reach a protected editor ancestor", () => {
        class EditorPanel extends CWidget {
            pasted = 0;
            selectedText(): string { return "selected"; }
            copy(): void {} cut(): void {} paste(): void { this.pasted++; }
            isReadOnly(): boolean { return false; }
        }
        const panel = new EditorPanel(root); panel.resize(200, 100);
        const shield = new CLoadingOverlay(panel); panel.setFocusPolicy(CFocusPolicy.StrongFocus); panel.setFocus(); shield.start();
        listeners.get("paste")!({ target: null, defaultPrevented: false, preventDefault: vi.fn(),
            clipboardData: { types: ["text/plain"], getData: () => "external" } });
        expect(panel.pasted).toBe(0); shield.stop(); panel.destroy();
    });

    test("painting the overlay preserves painter state and draws its message", () => {
        overlay.start("Loading data…");
        const p = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), clipRect: vi.fn(),
            setBrush: vi.fn(), fillRect: vi.fn(), setFont: vi.fn(), setPen: vi.fn(), setTextAlign: vi.fn(),
            setTextBaseline: vi.fn(), drawText: vi.fn(), setLineWidth: vi.fn(), drawLine: vi.fn() };
        overlay.render(p as unknown as CPainter);
        expect(p.drawText).toHaveBeenCalledWith("Loading data…", 150, overlay.indicator().y() + overlay.indicator().height() + 8);
        expect(p.save.mock.calls.length).toBe(p.restore.mock.calls.length);
    });

});
