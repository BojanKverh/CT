import { CVariantAnimation } from "../animation/CVariantAnimation.js";
import { CEasingCurveType } from "../animation/CEasingCurve.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import type { CFont } from "../gui/CFont.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CStyleState } from "../gui/CStyleOption.js";
import { CStyleOptionToggleSwitch } from "../gui/CStyleOptionToggleSwitch.js";
import type { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import type { CWidget } from "./CWidget.js";

/** Two-state switch. Space toggles on release; hidden/disabled controls snap to their logical state. */
export class CToggleSwitch extends CAbstractButton {
    #animation = new CVariantAnimation(this);
    #position = 0;
    #duration = 160;
    #press: "mouse" | "keyboard" | null = null;
    #hovered = false;
    #disposed = false;

    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setCheckable(true);
        this.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        this.#animation.setEasingCurve(CEasingCurveType.InOutQuad);
        this.#animation.valueChanged.connect(value => { this.#position = value; this.update(); });
        this.toggled.connect(() => this.#transition());
    }
    /**
     * Reads the current visual position of the switch thumb.
     * @returns Normalized position from zero for unchecked to one for checked, with intermediate values during animation.
     */
    thumbPosition(): number { return this.#position; }
    /**
     * Reads the time configured for a full thumb traversal.
     * @returns Duration in milliseconds. Zero disables animation.
     */
    animationDuration(): number { return this.#duration; }
    /**
     * Changes full-traversal duration and immediately snaps the thumb to the checked state.
     * @param duration Finite duration in milliseconds, rounded down and clamped to 0 through 60000.
     */
    setAnimationDuration(duration: number): void {
        if (!Number.isFinite(duration)) throw new RangeError("Animation duration must be finite.");
        this.#duration = Math.max(0, Math.min(60000, Math.floor(duration)));
        this.#snap();
    }
    /**
     * Changes the switch label and refreshes the preferred geometry.
     * @param text Text to show beside the switch.
     */
    override setText(text: string): void { super.setText(text); this.updateGeometry(); }
    /**
     * Changes the switch font and refreshes the preferred geometry.
     * @param font Font to use for the label.
     * @param _propagate The propagation option is accepted for compatibility. This method applies the font only to the switch.
     */
    override setFont(font: CFont, _propagate = false): void { super.setFont(font, false); this.updateGeometry(); }
    /**
     * Measures the switch track and optional label using the current font.
     * @returns Preferred width and height in logical pixels.
     */
    override sizeHint(): CSize {
        const fm = new CFontMetrics(this.font());
        return new CSize(52 + (this.text() ? 10 + Math.ceil(fm.textWidth(this.text())) : 0), Math.max(32, Math.ceil(fm.height()) + 8));
    }
    #canAnimate(): boolean {
        for (let widget: CWidget | null = this; widget !== null; widget = widget.parent())
            if (!widget.isVisible() || !widget.isEnabled()) return false;
        return !this.#disposed && this.#duration > 0;
    }
    #snap(): void { this.#animation.stop(); this.#position = this.isChecked() ? 1 : 0; this.update(); }
    #transition(): void {
        if (!this.#canAnimate()) { this.#snap(); return; }
        const from = this.#position, to = this.isChecked() ? 1 : 0;
        this.#animation.stop();
        this.#animation.setStartValue(from); this.#animation.setEndValue(to);
        this.#animation.setDuration(Math.max(1, Math.round(this.#duration * Math.abs(to - from))));
        this.#animation.start();
    }
    #cancel(): void { this.#press = null; this.#hovered = false; this.stopAutoRepeat(); this.update(); }
    #activate(): void {
        if (this.#disposed || this.inputBlocker() !== null) return;
        for (let widget: CWidget | null = this; widget !== null; widget = widget.parent())
            if (!widget.isVisible() || !widget.isEnabled()) return;
        this.toggle(); this.clicked.emit();
    }
    /**
     * Changes enabled state. Disabling cancels a pending press and snaps the thumb to its checked state.
     * @param enabled Whether to enable interaction.
     */
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancel();
        super.setEnabled(enabled);
        if (!enabled) this.#snap();
    }
    /** Cancels interaction and snaps the thumb if the switch or an ancestor is hidden or disabled, or animation is unavailable. */
    protected override visibilityChangeEvent(): void {
        if (!this.#canAnimate()) { this.#cancel(); this.#snap(); }
    }
    /**
     * Cancels a pending press and forwards focus exit to the base button.
     * @param event Focus exit event.
     */
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    /**
     * Accepts a left-button press. A press inside the switch begins pointer activation and requests focus.
     * @param event Mouse event with the button and pointer coordinates local to the widget.
     */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        if (this.rect().contains(new CPoint(event.x(), event.y()))) { this.#press = "mouse"; this.setFocus(); }
        event.accept(); this.update();
    }
    /**
     * Finishes a left-button press and toggles if the press began on the switch and the release is still inside. Activation also requires a visible, enabled hierarchy without an input blocker.
     * @param event Mouse event with the button and pointer coordinates local to the widget.
     */
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const activate = this.#press === "mouse" && this.rect().contains(new CPoint(event.x(), event.y()));
        this.#press = null; event.accept(); this.update(); if (activate) this.#activate();
    }
    /**
     * Sets hover styling and requests repainting.
     * @param event Pointer entry event.
     */
    protected override mouseEnterEvent(event: CMouseEvent): void { this.#hovered = true; event.accept(); this.update(); }
    /**
     * Clears hover styling and requests repainting.
     * @param event Pointer exit event.
     */
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = false; event.accept(); this.update(); }
    /**
     * Starts keyboard activation on Space without Ctrl, Alt or Meta, or cancels the press on Escape.
     * @param event Key press event with key and modifier states.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() === "Escape") { this.#cancel(); event.accept(); return; }
        if (event.key() === " " && !event.ctrl() && !event.alt() && !event.meta()) {
            if (this.#press === null) this.#press = "keyboard";
            event.accept(); this.update(); return;
        }
        event.ignore();
    }
    /**
     * Toggles on Space release only after a tracked keyboard press and without Ctrl, Alt or Meta.
     * @param event Key release event with key and modifier states.
     */
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const activate = this.#press === "keyboard"; this.#press = null; event.accept(); this.update();
        if (activate && !event.ctrl() && !event.alt() && !event.meta()) this.#activate();
    }
    /**
     * Passes the label, thumb position, hover and press state to the active switch style.
     * @param painter Painter in the switch's local coordinates.
     */
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionToggleSwitch(); option.initFromButton(this);
        option.text = this.text(); option.position = this.#position;
        if (this.#press !== null) option.state |= CStyleState.Sunken;
        if (this.#hovered) option.state |= CStyleState.MouseOver;
        this.style().drawToggleSwitch(painter, option);
    }
    /** Cancels interaction, destroys the thumb animation and releases the widget. */
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.#cancel(); this.#animation.destroy(); super.destroy();
    }
}
