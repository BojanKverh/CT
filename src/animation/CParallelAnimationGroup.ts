import { CAnimationState, CAnimationDirection } from "./CAbstractAnimation.js";
import { CAnimationGroup } from "./CAnimationGroup.js";
import type { CAbstractAnimation } from "./CAbstractAnimation.js";

/** Runs finite members together, including their loops. The group supplies one clock. */
export class CParallelAnimationGroup extends CAnimationGroup {
    #started = new Set<CAbstractAnimation>();
    #run = 0;

    /**
     * Measures one group pass using the longest member timeline.
     * @returns Maximum member duration including its loops, in milliseconds. An empty group returns zero.
     */
    override duration(): number {
        let duration = 0;
        for (const animation of this.animations()) duration = Math.max(duration, this.memberDuration(animation));
        return duration;
    }
    /** Reapplies the current value of each member whose loop count is nonzero. */
    override applyCurrentValue(): void {
        if (!this.isDestroyed()) for (const animation of this.animations())
            if (animation.loopCount() !== 0) animation.applyCurrentValue();
    }
    /** Validates member durations and starts a new group run, stopping the previous run if needed. */
    override start(): void {
        if (this.isDestroyed()) return;
        this.duration();
        if (this.state() !== CAnimationState.Stopped) this.stop();
        ++this.#run; super.start();
    }
    /** Stops the group and invalidates callbacks from the current run. */
    override stop(): void { ++this.#run; super.stop(); }
    /**
     * Invalidates the prior run callbacks and seeks all members through the group timeline.
     * @param time Finite elapsed group time in milliseconds across loops.
     */
    override setCurrentTime(time: number): void { ++this.#run; super.setCurrentTime(time); }
    /** Destroys the group and its owned members and clears playback tracking. */
    override destroy(): void { super.destroy(); this.#started.clear(); }
    /**
     * Stops and resets member playback tracking before the new group loop begins.
     * @param _loop New zero-based group loop index.
     * @param _previous Previous zero-based group loop index.
     */
    protected override updateCurrentLoop(_loop: number, _previous: number): void {
        const run = ++this.#run;
        for (const animation of this.animations()) {
            animation.stop();
            if (run !== this.#run || this.isDestroyed()) return;
        }
        this.#started.clear();
    }
    /**
     * Propagates the group lifecycle to its members. Running enables group-driven time, pausing pauses members, and stopping releases their clocks.
     * @param state New group state.
     * @param previous Previous group state. Starting from `Stopped` resets member playback tracking.
     */
    protected override updateState(state: CAnimationState, previous: CAnimationState): void {
        if (state === CAnimationState.Running) {
            if (previous === CAnimationState.Stopped) this.#started.clear();
            for (const animation of this.animations()) animation.setExternalClock(true);
            this.updateCurrentTime(this.currentLoopTime());
        } else {
            for (const animation of this.animations()) {
                if (this.state() !== state) break;
                if (state === CAnimationState.Paused) animation.pause();
                else { animation.stop(); animation.setExternalClock(false); }
            }
        }
    }
    /**
     * Drives each enabled member at the group position, capped to the member's total duration.
     * @param time Direction-adjusted time in milliseconds within the group pass.
     */
    protected override updateCurrentTime(time: number): void {
        const run = this.#run;
        const reverse = this.currentDirection() === CAnimationDirection.Backward;
        for (const animation of this.animations()) {
            if (animation.loopCount() === 0) continue;
            if (run !== this.#run || this.isDestroyed()) return;
            const childTime = Math.min(time, this.memberDuration(animation));
            const passed = reverse ? childTime <= 0 : childTime >= this.memberDuration(animation);
            animation.setDrivenBackward(reverse);
            if (this.state() !== CAnimationState.Stopped) {
                animation.setExternalClock(true);
                if (!this.#started.has(animation) || (!passed && animation.state() === CAnimationState.Stopped)) {
                    this.#started.add(animation); animation.start();
                } else if (this.state() === CAnimationState.Running && animation.state() === CAnimationState.Paused) animation.resume();
                if (run !== this.#run) return;
                if (this.state() === CAnimationState.Paused) animation.pause();
            }
            if (run !== this.#run) return;
            animation.setCurrentTime(childTime);
        }
    }
}
