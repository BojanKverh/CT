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

/** A local input shield with a spinner and message. The target owns this child. */
export class CLoadingOverlay extends CWidget {
    #target: CWidget;
    #busy: CBusyIndicator;
    #message = "Loading…";
    #opacity = 0.8;
    #previousFocus: CWidget | null = null;
    #disposed = false;

    constructor(target: CWidget) {
        super(target);
        this.#target = target;
        super.setVisible(false);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#busy = new CBusyIndicator(this);
        this.setGeometry(0, 0, target.width(), target.height());
    }
    /**
     * Identifies the widget whose subtree is shielded.
     * @returns The fixed target widget.
     */
    targetWidget(): CWidget { return this.#target; }
    /**
     * Exposes the spinner owned and displayed by the overlay.
     * @returns The overlay's `CBusyIndicator`.
     */
    indicator(): CBusyIndicator { return this.#busy; }
    /**
     * Reads the text displayed while loading.
     * @returns Configured message before visual truncation.
     */
    message(): string { return this.#message; }
    /**
     * Changes the loading message and requests repainting.
     * @param message Text to draw beneath the spinner.
     */
    setMessage(message: string): void { this.#message = message; this.update(); }
    /**
     * Reads the opacity multiplier applied to the overlay background.
     * @returns Fraction from zero to one.
     */
    overlayOpacity(): number { return this.#opacity; }
    /**
     * Changes the background opacity and requests repainting. Nonfinite values throw `RangeError`.
     * @param opacity Finite opacity multiplier, clamped to zero through one.
     */
    setOverlayOpacity(opacity: number): void {
        if (!Number.isFinite(opacity)) throw new RangeError("Overlay opacity must be finite.");
        this.#opacity = Math.max(0, Math.min(1, opacity)); this.update();
    }
    /**
     * Checks whether the overlay's local visibility flag is set.
     * @returns `true` while the overlay is locally visible.
     */
    isLoading(): boolean { return this.isVisible(); }
    /**
     * Shows the overlay, blocking target input and starting the spinner.
     * @param message Optional replacement loading message. Omit it to retain the current text.
     */
    start(message?: string): void { if (message !== undefined) this.setMessage(message); this.show(); }
    /** Hides the overlay, removes its input block and stops the spinner. */
    stop(): void { this.hide(); }
    #inside(widget: CWidget | null): boolean {
        for (let owner = widget; owner !== null; owner = owner.parent()) if (owner === this.#target) return true;
        return false;
    }
    /**
     * Registers or clears the target input blocker and starts or stops the spinner. On hide, restores the previous eligible focus if the overlay held focus.
     * @param visible `true` to display and activate the input shield, or `false` to remove it.
     */
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
    /**
     * Enforces the overlay's fixed ownership. Selecting any other parent throws.
     * @param parent Existing parent widget. Passing the same parent has no effect.
     */
    override setParent(parent: CWidget | null): void {
        if (parent !== this.parent()) throw new Error("A loading overlay cannot be reparented.");
    }
    /**
     * Changes the overlay bounds and sizes and centers the spinner within the available space.
     * @param x Horizontal offset in target coordinates.
     * @param y Vertical offset in target coordinates.
     * @param width Overlay width in logical pixels.
     * @param height Overlay height in logical pixels.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        if (this.#busy === undefined) return;
        const size = Math.max(0, Math.min(this.#busy.indicatorSize(), width - 16, height - 40));
        this.#busy.setGeometry((width - size) / 2, Math.max(0, (height - size - 24) / 2), size, size);
    }
    /**
     * Delegates focus events to the base widget, lets Tab pass to application navigation and consumes other input.
     * @param event Event delivered to the overlay.
     * @returns The base handler result for focus events, `false` for Tab presses, or `true` for consumed input.
     */
    override event(event: CEvent): boolean {
        if (event.type() === CEventType.FocusIn || event.type() === CEventType.FocusOut) return super.event(event);
        // Let application-level Tab navigation leave the panel.
        if (event.type() === CEventType.KeyPress
            && (event as CKeyEvent).key() === "Tab") { event.ignore(); return false; }
        event.accept(); return true;
    }
    /** Stops the visible overlay to remove its input block, then destroys the spinner and widget. */
    override destroy(): void {
        if (this.#disposed) return;
        if (this.isVisible()) this.stop();
        this.#disposed = true;
        this.#busy.destroy(); super.destroy();
    }
    /**
     * Fills the clipped overlay with a translucent background and draws a centered, width-limited message beneath the spinner.
     * @param painter Painter in overlay-local coordinates.
     */
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
