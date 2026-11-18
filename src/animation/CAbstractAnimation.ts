import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAnimationDriver } from "./CAnimationDriver.js";

export enum CAnimationState { Stopped, Paused, Running }
export enum CAnimationDirection { Forward, Backward }

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
    readonly stateChanged = new CSignal<[CAnimationState, CAnimationState]>();
    readonly finished = new CSignal<[]>();
    readonly destroyed = new CSignal<[]>();
    /** Emitted after value updates when total elapsed playback time changes. */
    readonly currentTimeChanged = new CSignal<[number]>();
    readonly currentLoopChanged = new CSignal<[number]>();
    readonly directionChanged = new CSignal<[CAnimationDirection]>();

    /**
     * Checks whether destruction has begun.
     * @returns `true` once the animation is marked disposed.
     */
    isDestroyed(): boolean { return this.#disposed; }
    /**
     * Checks whether a parent or another caller supplies playback time.
     * @returns `true` if the independent frame scheduler is disabled for this animation.
     */
    isExternallyDriven(): boolean { return this.#externalClock; }
    /**
     * Records the traversal direction supplied by a containing group.
     * @param backward `true` if the group is advancing through this member from its end toward its start.
     * @internal
     */
    setDrivenBackward(backward: boolean): void { this.#drivenBackward = backward; }
    /**
     * Switches between caller-supplied time and the independent scheduler. Returning a running animation to its own clock resumes at the current time.
     * @param external `true` to let the caller supply time.
     * @internal
     */
    setExternalClock(external: boolean): void {
        if (this.#disposed || external === this.#externalClock) return;
        this.#externalClock = external; ++this.#generation; this.#detach();
        if (!external) this.#drivenBackward = false;
        if (!external && this.#state === CAnimationState.Running) {
            this.#reanchor(); this.#attach();
        }
    }
    /**
     * Reads the current lifecycle state.
     * @returns `Stopped`, `Running` or `Paused`.
     */
    state(): CAnimationState { return this.#state; }
    /**
     * Reads the time allocated to one pass.
     * @returns Single-pass duration in milliseconds.
     */
    duration(): number { return this.#duration; }
    /**
     * Reads the position in the overall playback timeline.
     * @returns Elapsed timeline position in milliseconds across all loops.
     */
    currentTime(): number { return this.#time; }
    /**
     * Reads the current pass index.
     * @returns Zero-based loop index.
     */
    currentLoop(): number { return this.#loop; }
    /**
     * Reads the configured repetition count.
     * @returns Number of passes, or `-1` for unbounded repetition.
     */
    loopCount(): number { return this.#loopCount; }
    /**
     * Reads the configured initial direction.
     * @returns Forward or backward before loop alternation and group traversal are applied.
     */
    direction(): CAnimationDirection { return this.#direction; }
    /**
     * Checks whether playback alternates direction each loop.
     * @returns `true` if odd-numbered loop indexes reverse the configured direction.
     */
    autoReverse(): boolean { return this.#autoReverse; }
    /**
     * Computes the effective playback direction from the configured direction, loop parity and containing group traversal.
     * @returns The current forward or backward direction.
     */
    currentDirection(): CAnimationDirection {
        const reverse = (this.#direction === CAnimationDirection.Backward)
            !== (this.#autoReverse && this.#loop % 2 === 1);
        return reverse !== this.#drivenBackward ? CAnimationDirection.Backward : CAnimationDirection.Forward;
    }
    /**
     * Computes the duration across all configured loops. Throws if a finite total overflows.
     * @returns Total duration in milliseconds, or `-1` for unbounded repetition.
     */
    totalDuration(): number {
        const duration = this.duration();
        if (this.#loopCount === -1) return -1;
        const total = duration * this.#loopCount;
        if (!Number.isFinite(total)) throw new RangeError("Total animation duration must be finite.");
        return total;
    }
    /**
     * Converts overall elapsed time to the value position within the current pass, taking the configured direction and reverse parity into account.
     * @returns Position within the current pass, from zero to the single-pass duration in milliseconds.
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
     * Changes the repetition count and recomputes the current timeline position when needed. Setting zero stops a running or paused animation.
     * @param count Nonnegative safe integer number of passes, or `-1` for unbounded repetition with a positive duration.
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
     * Changes the initial direction. During a running or paused pass it preserves the displayed position and emits `directionChanged` after a successful change.
     * @param direction `Forward` or `Backward`.
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
     * Changes whether odd-numbered loop indexes reverse direction. During an active odd pass it preserves the displayed position.
     * @param enabled `true` to alternate direction between loops.
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
     * Sets the length of one pass and reapplies the current timeline position. Invalid duration and loop combinations throw `RangeError`.
     * @param duration Finite nonnegative duration in milliseconds. Unbounded repetition requires a positive duration.
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
    /** Reapplies the value at the current loop position without moving the playhead or changing state. Disposed animations ignore the request. */
    applyCurrentValue(): void { if (!this.#disposed) this.updateCurrentTime(this.currentLoopTime()); }
    /**
     * Seeks across all loops and applies the value at the new position. An active run finishes when the seek reaches its endpoint.
     * @param time Finite timeline position in milliseconds, clamped to zero and the total duration for a bounded run.
     */
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
    /** Starts a fresh run at its initial value. Zero loops leave it stopped, and a zero-duration run completes immediately. */
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
    /** Suspends a running animation and retains its current timeline position. */
    pause(): void {
        if (this.#state !== CAnimationState.Running) return;
        ++this.#generation; this.#detach(); this.#setState(CAnimationState.Paused);
    }
    /** Continues a paused animation from its retained timeline position. */
    resume(): void {
        if (this.#disposed || this.#state !== CAnimationState.Paused) return;
        const generation = ++this.#generation; this.#reanchor();
        this.#setState(CAnimationState.Running);
        if (generation === this.#generation && !this.#disposed) this.#attach();
    }
    /** Stops playback and retains the displayed position. Does not emit `finished`. */
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
     * Provides the subclass hook after the state changes and before `stateChanged` is emitted.
     * @param _state New lifecycle state.
     * @param _previous Previous lifecycle state.
     */
    protected updateState(_state: CAnimationState, _previous: CAnimationState): void {}
    /**
     * Provides the subclass hook before observers are notified of a loop change.
     * @param _loop New zero-based loop index.
     * @param _previous Previous zero-based loop index.
     */
    protected updateCurrentLoop(_loop: number, _previous: number): void {}
    /**
     * Applies the subclass-specific value at the supplied position within a pass.
     * @param time Direction-adjusted position in milliseconds within the current pass.
     */
    protected abstract updateCurrentTime(time: number): void;
    /** Marks the animation disposed, stops its clock, releases child objects and emits `destroyed` once. */
    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true; this.stop(); super.destroy(); this.destroyed.emit();
    }
}
