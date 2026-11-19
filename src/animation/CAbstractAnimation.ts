/** @module Animation/CAbstractAnimation */
import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAnimationDriver } from "./CAnimationDriver.js";

/**
 * Playback lifecycle of an animation; pausing retains elapsed progress.
 */
export enum CAnimationState {
    /**
    * Playback is inactive; starting begins a new run.
    */
    Stopped,
    /**
    * Playback is suspended while retaining the current time.
    */
    Paused,
    /**
    * The animation clock advances and updates the current value.
    */
    Running
}
/**
 * Direction in which animation time advances through a loop.
 */
export enum CAnimationDirection {
    /**
    * Advance time from the start toward the end of each loop.
    */
    Forward,
    /**
    * Advance time from the end toward the start of each loop.
    */
    Backward
}

/**
 * Forward playback time in milliseconds, with repeat and value-direction control.
 * currentTime()/setCurrentTime() use elapsed time across all loops, independent
 * of direction. currentLoopTime() is the directed position within one loop.
 * duration() is one loop; totalDuration() is all loops, or -1 for endless playback.
 * autoReverse alternates the value direction on odd loops. Each leg counts once.
 */
export abstract class CAbstractAnimation extends CObject {
    #state = CAnimationState.Stopped;
    #duration = 250;
    #time = 0;
    #loop = 0;
    #loopCount = 1;
    #direction = CAnimationDirection.Forward;
    #autoReverse = false;
    #origin = 0;
    #generation = 0;
    #removeTick: (() => void) | null = null;
    #disposed = false;
    #externalClock = false;
    #drivenBackward = false;
    #notifiedTime = 0;
    /**
    * Emitted with the new playback state followed by the previous state.
    * @group Signals
    */
    readonly stateChanged = new CSignal<[CAnimationState, CAnimationState]>();
    /**
    * Emitted when playback reaches its natural end; stopping explicitly does not finish the animation.
    * @group Signals
    */
    readonly finished = new CSignal<[]>();
    /**
    * Emitted when the animation object is destroyed.
    * @group Signals
    */
    readonly destroyed = new CSignal<[]>();
    /**
    * Emitted after value updates when total elapsed playback time changes.
    * @group Signals
    */
    readonly currentTimeChanged = new CSignal<[number]>();
    /**
    * Emitted with the zero-based loop number when playback enters another loop.
    * @group Signals
    */
    readonly currentLoopChanged = new CSignal<[number]>();
    /**
    * Emitted with the new forward or backward playback direction.
    * @group Signals
    */
    readonly directionChanged = new CSignal<[CAnimationDirection]>();

    /**
    * Reports whether this animation has released its driver registration and owned resources.
    */
    isDestroyed(): boolean { return this.#disposed; }
    /**
    * Reports whether a containing driver controls timeline advancement.
    */
    isExternallyDriven(): boolean { return this.#externalClock; }
    /** @internal A containing group supplies both time and traversal direction. */
    setDrivenBackward(backward: boolean): void { this.#drivenBackward = backward; }
    /** @internal Groups may supply time instead of scheduling an independent clock. */
    setExternalClock(external: boolean): void {
        if (this.#disposed || external === this.#externalClock) return;
        this.#externalClock = external; ++this.#generation; this.#detach();
        if (!external) this.#drivenBackward = false;
        if (!external && this.#state === CAnimationState.Running) {
            this.#reanchor(); this.#attach();
        }
    }
    /**
    * Current lifecycle state.
    * The initial value is `CAnimationState.Stopped`.
    */
    state(): CAnimationState { return this.#state; }
    /**
    * Animation duration in milliseconds.
    * The initial value is `250`.
    */
    duration(): number { return this.#duration; }
    /**
    * Current position along the animation timeline in milliseconds.
    * The initial value is `0`.
    */
    currentTime(): number { return this.#time; }
    /**
    * Returns the zero-based current loop number.
    */
    currentLoop(): number { return this.#loop; }
    /**
    * Configured number of animation loops.
    * The initial value is `1`.
    */
    loopCount(): number { return this.#loopCount; }
    /**
    * Direction in which the animation timeline advances.
    * The initial value is `CAnimationDirection.Forward`.
    */
    direction(): CAnimationDirection { return this.#direction; }
    /**
    * Reports whether playback reverses direction on alternating loops.
    */
    autoReverse(): boolean { return this.#autoReverse; }
    /** Effective direction of the value, including alternating and containing groups. */
    currentDirection(): CAnimationDirection {
        const reverse = (this.#direction === CAnimationDirection.Backward)
            !== (this.#autoReverse && this.#loop % 2 === 1);
        return reverse !== this.#drivenBackward ? CAnimationDirection.Backward : CAnimationDirection.Forward;
    }
    /**
    * Returns duration across configured loops, using the animation's unbounded-duration convention where applicable.
    */
    totalDuration(): number {
        const duration = this.duration();
        if (this.#loopCount === -1) return -1;
        const total = duration * this.#loopCount;
        if (!Number.isFinite(total)) throw new RangeError("Total animation duration must be finite.");
        return total;
    }
    /**
    * Returns the timeline position within the active loop.
    */
    currentLoopTime(): number {
        const duration = this.duration();
        const atEnd = this.#loopCount > 0 && this.#time === this.totalDuration();
        const phase = atEnd ? duration : Math.max(0, Math.min(duration, this.#time - this.#loop * duration));
        const reverse = (this.#direction === CAnimationDirection.Backward)
            !== (this.#autoReverse && this.#loop % 2 === 1);
        return reverse ? duration - phase : phase;
    }
    /**
    * Configures repeat count for playback, using the supported sentinel for infinite repeats.
    */
    setLoopCount(count: number): void {
        if (!Number.isSafeInteger(count) || count < -1) throw new RangeError("Loop count must be -1 or a nonnegative safe integer.");
        this.#validate(this.duration(), count);
        this.#loopCount = count;
        if (this.#state === CAnimationState.Stopped && this.#time === 0 && this.#loop === 0) return;
        if (this.#state !== CAnimationState.Stopped && count === 0) { this.stop(); return; }
        this.setCurrentTime(this.#time);
    }
    /**
    * Changes forward or backward timeline playback.
    */
    setDirection(direction: CAnimationDirection): void {
        if (direction !== CAnimationDirection.Forward && direction !== CAnimationDirection.Backward)
            throw new RangeError("Unknown animation direction.");
        if (this.#disposed || direction === this.#direction) return;
        this.#direction = direction;
        this.#mirrorPhase();
        if (this.#direction === direction && !this.#disposed) this.directionChanged.emit(direction);
    }
    /**
    * Enables direction reversal on alternating animation loops.
    */
    setAutoReverse(enabled: boolean): void {
        if (this.#disposed || enabled === this.#autoReverse) return;
        this.#autoReverse = enabled;
        if (this.#loop % 2 === 1) this.#mirrorPhase();
    }
    #mirrorPhase(): void {
        // Preserve the current displayed position on a live direction change.
        if (this.#state === CAnimationState.Stopped) return;
        const duration = this.duration();
        this.#time = this.#loop * duration + duration - (this.#time - this.#loop * duration);
        const generation = ++this.#generation; this.#detach(); this.#reanchor();
        this.updateCurrentTime(this.currentLoopTime());
        this.#notifyTime();
        if (generation === this.#generation && this.#state === CAnimationState.Running) this.#attach();
    }
    /**
    * Changes the duration of one animation loop in milliseconds.
    */
    setDuration(duration: number): void {
        this.#validate(duration, this.#loopCount);
        this.#duration = duration; this.setCurrentTime(this.#time);
    }
    #validate(duration: number, count: number): void {
        if (!Number.isFinite(duration) || duration < 0)
            throw new RangeError("Duration must be finite and nonnegative.");
        if (count === -1 && duration === 0) throw new RangeError("An endless animation needs a positive duration.");
        if (count !== -1 && !Number.isFinite(duration * count))
            throw new RangeError("Total animation duration must be finite.");
    }
    /** Reapplies the current value without changing playback time or state. */
    applyCurrentValue(): void { if (!this.#disposed) this.updateCurrentTime(this.currentLoopTime()); }
    /** Seeks elapsed playback time across all loops; a running endpoint seek finishes. */
    setCurrentTime(time: number): void {
        if (!Number.isFinite(time)) throw new RangeError("Animation time must be finite.");
        if (this.#disposed) return;
        const generation = ++this.#generation;
        try { this.#setTime(time, generation); this.#notifyTime(); }
        catch (error) { this.stop(); throw error; }
        if (generation !== this.#generation || this.#disposed) return;
        this.#reanchor();
        if (this.#state === CAnimationState.Running) {
            this.#detach();
            if (this.#atEnd()) this.#finish(); else this.#attach();
        }
    }
    #setTime(time: number, generation: number): void {
        const total = this.totalDuration(), duration = this.duration();
        const next = Math.max(0, Math.min(total < 0 ? Number.MAX_VALUE : total, time));
        let loop = duration === 0 ? Math.max(0, this.#loopCount - 1) : Math.floor(next / duration);
        if (duration > 0 && next > 0 && (this.#drivenBackward || (total >= 0 && next === total)) && next % duration === 0)
            --loop;
        if (this.#loopCount >= 0) loop = Math.min(loop, Math.max(0, this.#loopCount - 1));
        if (!Number.isSafeInteger(loop)) throw new RangeError("Elapsed time exceeds the safe loop index range.");
        if (loop !== this.#loop) {
            // Finish the old leg before resetting group members. Long frame gaps
            // skip intermediate loops arithmetically rather than blocking the UI.
            if (this.#state === CAnimationState.Running) {
                const reverse = this.currentDirection() === CAnimationDirection.Backward;
                this.updateCurrentTime(reverse ? 0 : duration);
                if (generation !== this.#generation || this.#disposed) return;
            }
            const previous = this.#loop;
            this.#time = next; this.#loop = loop;
            this.updateCurrentLoop(loop, previous);
            if (generation !== this.#generation || this.#disposed) return;
            this.currentLoopChanged.emit(loop);
            if (generation !== this.#generation || this.#disposed) return;
        } else this.#time = next;
        this.updateCurrentTime(this.currentLoopTime());
    }
    /** Starts a new run. Direction Backward starts with the last value. */
    start(): void {
        try { this.#start(); }
        finally { this.#notifyTime(); }
    }
    #start(): void {
        if (this.#disposed) return;
        this.#validate(this.duration(), this.#loopCount);
        this.#detach();
        const generation = ++this.#generation;
        if (this.#loopCount === 0) { this.#time = 0; this.#loop = 0; this.stop(); return; }
        const total = this.totalDuration();
        if (this.#drivenBackward && total < 0) throw new Error("Cannot reverse an endless member inside a group.");
        this.#time = this.#drivenBackward ? total : 0;
        const previousLoop = this.#loop;
        this.#loop = this.#drivenBackward || this.duration() === 0 ? Math.max(0, this.#loopCount - 1) : 0;
        this.#reanchor();
        this.#setState(CAnimationState.Running);
        if (generation !== this.#generation || this.#disposed) return;
        if (previousLoop !== this.#loop) this.currentLoopChanged.emit(this.#loop);
        if (generation !== this.#generation || this.#disposed) return;
        this.updateCurrentTime(this.currentLoopTime());
        this.#notifyTime();
        if (generation !== this.#generation || this.#disposed) return;
        if (this.duration() === 0) this.#finish(); else this.#attach();
    }
    /**
    * Suspends a running animation while retaining its timeline position.
    */
    pause(): void {
        if (this.#state !== CAnimationState.Running) return;
        ++this.#generation; this.#detach(); this.#setState(CAnimationState.Paused);
    }
    /**
    * Continues a paused animation from its retained timeline position.
    */
    resume(): void {
        if (this.#disposed || this.#state !== CAnimationState.Paused) return;
        const generation = ++this.#generation; this.#reanchor();
        this.#setState(CAnimationState.Running);
        if (generation === this.#generation && !this.#disposed) this.#attach();
    }
    /** Stops without emitting finished and retains displayed time/value. */
    stop(): void { ++this.#generation; this.#detach(); this.#setState(CAnimationState.Stopped); }
    #reanchor(): void { this.#origin = CAnimationDriver.now() - this.#time; }
    #atEnd(): boolean {
        return this.#drivenBackward ? this.#time <= 0 : this.totalDuration() >= 0 && this.#time >= this.totalDuration();
    }
    #attach(): void {
        if (this.#externalClock) return;
        const generation = this.#generation;
        this.#removeTick = CAnimationDriver.add(now => {
            if (this.#disposed || generation !== this.#generation || this.#state !== CAnimationState.Running) return;
            try {
                this.#setTime(Math.max(this.#time, now - this.#origin), generation);
                this.#notifyTime();
                if (generation === this.#generation && this.#state === CAnimationState.Running && this.#atEnd()) this.#finish();
            } catch (error) {
                this.stop(); throw error;
            }
        });
    }
    #notifyTime(): void {
        if (this.#disposed || this.#time === this.#notifiedTime) return;
        this.#notifiedTime = this.#time;
        this.currentTimeChanged.emit(this.#time);
    }
    #detach(): void { this.#removeTick?.(); this.#removeTick = null; }
    #setState(state: CAnimationState): void {
        if (state === this.#state) return;
        const previous = this.#state; this.#state = state;
        this.updateState(state, previous);
        if (this.#state === state) this.stateChanged.emit(state, previous);
    }
    #finish(): void {
        this.#detach(); ++this.#generation; this.#setState(CAnimationState.Stopped);
        if (!this.#disposed) this.finished.emit();
    }
    /**
    * Override to respond to lifecycle transitions between stopped, running and paused states.
    */
    protected updateState(_state: CAnimationState, _previous: CAnimationState): void {}
    /** Called before currentLoopChanged when the elapsed-time loop changes. */
    protected updateCurrentLoop(_loop: number, _previous: number): void {}
    /**
    * Override to apply the animation value at the supplied timeline position in milliseconds.
    */
    protected abstract updateCurrentTime(time: number): void;
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.stop(); super.destroy(); this.destroyed.emit();
    }
}
