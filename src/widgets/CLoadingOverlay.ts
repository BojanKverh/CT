/** @module Widgets/CLoadingOverlay */
import { CApplication } from "../core/CApplication.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CEvent } from "../events/CEvent.js";
import { CEventType } from "../events/CEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CBusyIndicator } from "./CBusyIndicator.js";
import { CWidget } from "./CWidget.js";

/** A local input shield with a spinner and message. The target owns this child.
 *
 * @example
 * With an existing application and parent widget, shield only the target panel during an asynchronous operation. A finally block releases input even if the operation fails.
 * ```ts
 * import { CWidget, CLoadingOverlay } from "canvas-toolkit-lib";
 *
 * function createRecordLoader(parent: CWidget) {
 *     const overlay = new CLoadingOverlay(parent);
 *     async function refresh(): Promise<void> {
 *         overlay.start("Loading records…");
 *         try {
 *             const response = await fetch("/api/records");
 *             if (!response.ok) throw new Error("Loading failed: " + response.status);
 *             console.log(await response.json());
 *         } finally {
 *             overlay.stop();
 *         }
 *     }
 *     void refresh().catch(error => console.error(error));
 *     return refresh;
 * }
 * ```
 */
export class CLoadingOverlay extends CWidget {
    #target: CWidget;
    #busy: CBusyIndicator;
    #message = "Loading…";
    #opacity = 0.8;
    #previousFocus: CWidget | null = null;
    #disposed = false;

    /**
    * Attaches progress feedback and an input shield to the supplied target widget.
    * @param target Widget or object controlled by this component.
    */
    constructor(target: CWidget) {
        super(target);
        this.#target = target;
        super.setVisible(false);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#busy = new CBusyIndicator(this);
        this.setGeometry(0, 0, target.width(), target.height());
    }
    /**
    * Returns the widget subtree covered and blocked by this overlay.
    */
    targetWidget(): CWidget { return this.#target; }
    /**
    * Returns the busy indicator displayed by the overlay.
    */
    indicator(): CBusyIndicator { return this.#busy; }
    /**
    * Returns the status text displayed with the busy indicator.
    */
    message(): string { return this.#message; }
    /**
    * Changes the status message and updates overlay presentation.
    */
    setMessage(message: string): void { this.#message = message; this.update(); }
    /**
    * Returns the configured opacity of the overlay background.
    */
    overlayOpacity(): number { return this.#opacity; }
    /**
    * Changes overlay background opacity.
    */
    setOverlayOpacity(opacity: number): void {
        if (!Number.isFinite(opacity)) throw new RangeError("Overlay opacity must be finite.");
        this.#opacity = Math.max(0, Math.min(1, opacity)); this.update();
    }
    /**
    * Reports whether the overlay is active and blocking its target.
    */
    isLoading(): boolean { return this.isVisible(); }
    /**
    * Shows the loading overlay and starts busy feedback over the target subtree.
    */
    start(message?: string): void { if (message !== undefined) this.setMessage(message); this.show(); }
    /**
    * Hides the loading overlay and restores target interaction.
    */
    stop(): void { this.hide(); }
    #inside(widget: CWidget | null): boolean {
        for (let owner = widget; owner !== null; owner = owner.parent()) if (owner === this.#target) return true;
        return false;
    }
    override setVisible(visible: boolean): void {
        if (this.#disposed || visible === this.isVisible()) return;
        const app = CApplication.instance();
        if (visible) {
            // Register before showing, so conflicting overlays fail without becoming visible.
            this.#target.setInputBlocker(this);
            app.closeAllPopups();
            const focus = app.focusWidget();
            this.#previousFocus = this.#inside(focus) ? focus : null;
            if (this.#inside(app.mouseGrabber())) app.releaseMouse();
            super.setVisible(true);
            this.#busy.start();
            if (this.#previousFocus !== null) this.setFocus();
        } else {
            const hadFocus = app.focusWidget() === this;
            this.#busy.stop();
            if (this.#target.inputBlocker() === this) this.#target.setInputBlocker(null);
            super.setVisible(false);
            if (hadFocus) {
                app.setFocusWidget(null);
                if (this.#previousFocus?.canReceiveFocus()) this.#previousFocus.setFocus();
            }
            this.#previousFocus = null;
        }
    }
    /** Overlays stay attached to the widget they protect. */
    override setParent(parent: CWidget | null): void {
        if (parent !== this.parent()) throw new Error("A loading overlay cannot be reparented.");
    }
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        if (this.#busy === undefined) return;
        const size = Math.max(0, Math.min(this.#busy.indicatorSize(), width - 16, height - 40));
        this.#busy.setGeometry((width - size) / 2, Math.max(0, (height - size - 24) / 2), size, size);
    }
    override event(event: CEvent): boolean {
        if (event.type() === CEventType.FocusIn || event.type() === CEventType.FocusOut) return super.event(event);
        // Let application-level Tab navigation leave the panel.
        if (event.type() === CEventType.KeyPress
            && (event as CKeyEvent).key() === "Tab") { event.ignore(); return false; }
        event.accept(); return true;
    }
    override destroy(): void {
        if (this.#disposed) return;
        if (this.isVisible()) this.stop();
        this.#disposed = true;
        this.#busy.destroy(); super.destroy();
    }
    protected override paintEvent(painter: CPainter): void {
        painter.save();
        try {
            painter.clipRect(this.rect());
            const color = this.palette().color(CPaletteColorRole.Window);
            color.setAlpha(Math.round(color.alpha() * this.#opacity));
            painter.setBrush(color.toCss()); painter.fillRect(this.rect());
            painter.setFont(this.font()); painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
            painter.setTextAlign("center"); painter.setTextBaseline("top");
            const metrics = new CFontMetrics(this.font());
            let text = this.#message;
            const chars = Array.from(text);
            while (chars.length > 0 && metrics.textWidth(text) > Math.max(0, this.width() - 24)) {
                chars.pop(); text = chars.join("") + "…";
            }
            if (metrics.textWidth(text) <= Math.max(0, this.width() - 24))
                painter.drawText(text, this.width() / 2, this.#busy.y() + this.#busy.height() + 8);
        } finally { painter.restore(); }
    }
}
