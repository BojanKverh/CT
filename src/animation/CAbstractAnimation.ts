import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAnimationDriver } from "./CAnimationDriver.js";

export enum CAnimationState { Stopped, Paused, Running }

/** Finite, forward animation. Durations and current times are in milliseconds. */
export abstract class CAbstractAnimation extends CObject {
    #state = CAnimationState.Stopped;
    #duration = 250;
    #time = 0;
    #origin = 0;
    #generation = 0;
    #removeTick: (() => void) | null = null;
    #disposed = false;
    #externalClock = false;
    readonly stateChanged = new CSignal<[CAnimationState, CAnimationState]>();
    readonly finished = new CSignal<[]>();
    readonly destroyed = new CSignal<[]>();

    isDestroyed(): boolean { return this.#disposed; }
    /** @internal Groups may supply time instead of scheduling an independent clock. */
    isExternallyDriven(): boolean { return this.#externalClock; }
    setExternalClock(external: boolean): void {
        if (this.#disposed || external === this.#externalClock) return;
        this.#externalClock = external; ++this.#generation; this.#detach();
        if (!external && this.#state === CAnimationState.Running) {
            this.#origin = CAnimationDriver.now() - this.#time;
            this.#attach();
        }
    }
    /** Reapplies the current value without changing playback time or state. */
    applyCurrentValue(): void {
        if (!this.#disposed) this.updateCurrentTime(this.#time);
    }
    state(): CAnimationState { return this.#state; }
    duration(): number { return this.#duration; }
    currentTime(): number { return this.#time; }
    setDuration(duration: number): void {
        if (!Number.isFinite(duration) || duration < 0) throw new RangeError("Duration must be finite and nonnegative.");
        this.#duration = duration;
        this.setCurrentTime(this.#time);
    }
    /** Seeking while running also reanchors the clock; a running seek to the end finishes. */
    setCurrentTime(time: number): void {
        if (!Number.isFinite(time)) throw new RangeError("Animation time must be finite.");
        if (this.#disposed) return;
        const generation = ++this.#generation;
        this.#time = Math.max(0, Math.min(this.duration(), time));
        this.#origin = CAnimationDriver.now() - this.#time;
        this.updateCurrentTime(this.#time);
        if (generation !== this.#generation) return;
        if (this.#state === CAnimationState.Running) {
            this.#detach();
            if (this.#time >= this.duration()) this.#finish();
            else this.#attach();
        }
    }
    /** Always starts a new run from zero, including when already running or paused. */
    start(): void {
        if (this.#disposed) return;
        this.#detach();
        const generation = ++this.#generation;
        this.#time = 0;
        this.#origin = CAnimationDriver.now();
        this.#setState(CAnimationState.Running);
        if (generation !== this.#generation || this.#disposed) return;
        this.updateCurrentTime(0);
        if (generation !== this.#generation || this.#disposed) return;
        if (this.duration() === 0) this.#finish(); else this.#attach();
    }
    pause(): void {
        if (this.#state !== CAnimationState.Running) return;
        ++this.#generation; this.#detach(); this.#setState(CAnimationState.Paused);
    }
    resume(): void {
        if (this.#disposed || this.#state !== CAnimationState.Paused) return;
        const generation = ++this.#generation;
        this.#origin = CAnimationDriver.now() - this.#time;
        this.#setState(CAnimationState.Running);
        if (generation === this.#generation && !this.#disposed) this.#attach();
    }
    /** Stops without emitting finished and retains the last displayed time/value. */
    stop(): void {
        ++this.#generation; this.#detach(); this.#setState(CAnimationState.Stopped);
    }
    #attach(): void {
        if (this.#externalClock) return;
        const generation = this.#generation;
        this.#removeTick = CAnimationDriver.add(now => {
            if (this.#disposed || generation !== this.#generation || this.#state !== CAnimationState.Running) return;
            this.#time = Math.min(this.duration(), Math.max(this.#time, now - this.#origin));
            this.updateCurrentTime(this.#time);
            if (generation === this.#generation && this.#state === CAnimationState.Running
                && this.#time >= this.duration()) this.#finish();
        });
    }
    #detach(): void { this.#removeTick?.(); this.#removeTick = null; }
    #setState(state: CAnimationState): void {
        if (state === this.#state) return;
        const previous = this.#state; this.#state = state;
        this.updateState(state, previous);
        // Hooks can synchronously stop/restart an animation through child signals.
        if (this.#state === state) this.stateChanged.emit(state, previous);
    }
    #finish(): void {
        this.#detach(); ++this.#generation;
        this.#setState(CAnimationState.Stopped);
        if (!this.#disposed) this.finished.emit();
    }
    /** Called before stateChanged; subclasses may coordinate subordinate animations. */
    protected updateState(_state: CAnimationState, _previous: CAnimationState): void {}
    protected abstract updateCurrentTime(time: number): void;
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.stop(); super.destroy(); this.destroyed.emit();
    }
}
