/** @module Widgets/CBusyIndicator */
import { CVariantAnimation } from "../animation/CVariantAnimation.js";
import { CAnimationState } from "../animation/CAbstractAnimation.js";
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CStyleOptionBusyIndicator } from "../gui/CStyleOptionBusyIndicator.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

/** Indeterminate progress using the shared animation driver.
 * Hidden ancestors suspend animation. Stopping leaves layout geometry intact.
 */
export class CBusyIndicator extends CWidget {
    #animation = new CVariantAnimation(this);
    #running = false;
    #disposed = false;
    #size = 32;
    #angle = 0;
    /**
    * Emitted with the new animation-running flag when the indicator starts or stops.
    * @group Signals
    */
    readonly runningChanged = new CSignal<[boolean]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        this.#animation.setStartValue(0); this.#animation.setEndValue(360);
        this.#animation.setDuration(1000); this.#animation.setLoopCount(-1);
        this.#animation.valueChanged.connect(value => { this.#angle = value; this.update(); });
    }
    /** Requested state; remains true while hidden and suspended. */
    isRunning(): boolean { return this.#running; }
    /** Whether the animation currently receives frames. */
    isAnimating(): boolean { return this.#animation.state() === CAnimationState.Running; }
    /**
    * Returns the current rotation angle used by indicator painting.
    */
    angle(): number { return this.#angle; }
    /**
    * Returns the time in milliseconds for one visual rotation cycle.
    */
    cycleDuration(): number { return this.#animation.duration(); }
    /**
    * Returns the preferred logical extent of the busy indicator.
    */
    indicatorSize(): number { return this.#size; }
    /**
    * Starts indeterminate animation and requests visual updates.
    */
    start(): void { this.setRunning(true); }
    /**
    * Stops indeterminate animation.
    */
    stop(): void { this.setRunning(false); }
    /**
    * Starts or stops the indicator according to the requested state.
    */
    setRunning(running: boolean): void {
        if (this.#disposed || running === this.#running) return;
        this.#running = running;
        if (!running) { this.#animation.stop(); this.#angle = 0; }
        this.#sync(); this.update(); this.runningChanged.emit(running);
    }
    /** Duration of one revolution, in milliseconds (16..60000). */
    setCycleDuration(duration: number): void {
        if (!Number.isFinite(duration)) throw new RangeError("Cycle duration must be finite.");
        const next = Math.max(16, Math.min(60000, Math.floor(duration)));
        if (next === this.cycleDuration()) return;
        const fraction = (this.#animation.currentLoopTime() / this.cycleDuration());
        this.#animation.setDuration(next);
        this.#animation.setCurrentTime(fraction * next);
    }
    /** Preferred diameter, in logical pixels (8..256). */
    setIndicatorSize(size: number): void {
        if (!Number.isFinite(size)) throw new RangeError("Indicator size must be finite.");
        const next = Math.max(8, Math.min(256, Math.floor(size)));
        if (next === this.#size) return;
        this.#size = next; this.updateGeometry(); this.update();
    }
    override sizeHint(): CSize { return new CSize(this.#size, this.#size); }
    protected override visibilityChangeEvent(): void { this.#sync(); }
    #sync(): void {
        if (this.#disposed || !this.#running) return;
        let visible = true;
        for (let owner: CWidget | null = this; owner !== null; owner = owner.parent()) {
            if (!owner.isVisible()) { visible = false; break; }
        }
        if (!visible) this.#animation.pause();
        else if (this.#animation.state() === CAnimationState.Paused) this.#animation.resume();
        else if (this.#animation.state() === CAnimationState.Stopped) this.#animation.start();
    }
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.#running = false; this.#animation.destroy(); super.destroy();
    }
    protected override paintEvent(painter: CPainter): void {
        const option = new CStyleOptionBusyIndicator(); option.initFrom(this);
        option.running = this.#running; option.angle = this.#angle;
        this.style().drawBusyIndicator(painter, option);
    }
}
