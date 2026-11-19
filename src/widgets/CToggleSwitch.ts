/** @module Widgets/CToggleSwitch */
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

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setCheckable(true);
        this.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        this.#animation.setEasingCurve(CEasingCurveType.InOutQuad);
        this.#animation.valueChanged.connect(value => { this.#position = value; this.update(); });
        this.toggled.connect(() => this.#transition());
    }
    /**
    * Returns the current interpolated position used to paint the switch thumb.
    */
    thumbPosition(): number { return this.#position; }
    /**
    * Returns the transition duration in milliseconds.
    */
    animationDuration(): number { return this.#duration; }
    /** Milliseconds for a full transition (0 disables animation). */
    setAnimationDuration(duration: number): void {
        if (!Number.isFinite(duration)) throw new RangeError("Animation duration must be finite.");
        this.#duration = Math.max(0, Math.min(60000, Math.floor(duration)));
        this.#snap();
    }
    override setText(text: string): void { super.setText(text); this.updateGeometry(); }
    override setFont(font: CFont, _propagate = false): void { super.setFont(font, false); this.updateGeometry(); }
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
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#cancel();
        super.setEnabled(enabled);
        if (!enabled) this.#snap();
    }
    protected override visibilityChangeEvent(): void {
        if (!this.#canAnimate()) { this.#cancel(); this.#snap(); }
    }
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        if (this.rect().contains(new CPoint(event.x(), event.y()))) { this.#press = "mouse"; this.setFocus(); }
        event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        const activate = this.#press === "mouse" && this.rect().contains(new CPoint(event.x(), event.y()));
        this.#press = null; event.accept(); this.update(); if (activate) this.#activate();
    }
    protected override mouseEnterEvent(event: CMouseEvent): void { this.#hovered = true; event.accept(); this.update(); }
    protected override mouseLeaveEvent(event: CMouseEvent): void { this.#hovered = false; event.accept(); this.update(); }
    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() === "Escape") { this.#cancel(); event.accept(); return; }
        if (event.key() === " " && !event.ctrl() && !event.alt() && !event.meta()) {
            if (this.#press === null) this.#press = "keyboard";
            event.accept(); this.update(); return;
        }
        event.ignore();
    }
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " ") { event.ignore(); return; }
        const activate = this.#press === "keyboard"; this.#press = null; event.accept(); this.update();
        if (activate && !event.ctrl() && !event.alt() && !event.meta()) this.#activate();
    }
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionToggleSwitch(); option.initFromButton(this);
        option.text = this.text(); option.position = this.#position;
        if (this.#press !== null) option.state |= CStyleState.Sunken;
        if (this.#hovered) option.state |= CStyleState.MouseOver;
        this.style().drawToggleSwitch(painter, option);
    }
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.#cancel(); this.#animation.destroy(); super.destroy();
    }
}
