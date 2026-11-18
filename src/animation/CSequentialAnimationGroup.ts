import { CAbstractAnimation, CAnimationState, CAnimationDirection } from "./CAbstractAnimation.js";
import { CAnimationGroup } from "./CAnimationGroup.js";
import { CSignal } from "../core/CSignal.js";

/** Runs members in insertion order. Duration is the sum of member durations.
 * Only the active member plays. Completed values are retained; future members
 * do not write to their targets until reached. All elapsed time comes from the
 * group's clock, including frame overshoot into subsequent members.
 */
export class CSequentialAnimationGroup extends CAnimationGroup {
    #current: CAbstractAnimation | null = null;
    #started = new Set<CAbstractAnimation>();
    #run = 0;
    #seeking = false;
    readonly currentAnimationChanged = new CSignal<[CAbstractAnimation | null]>();

    /**
     * Adds the total durations of the member timelines. Throws if the sum is not finite.
     * @returns Duration of one group pass in milliseconds, or zero for an empty group.
     */
    override duration(): number {
        let total = 0;
        for (const animation of this.animations()) total += this.memberDuration(animation);
        if (!Number.isFinite(total)) {
            // Invalid changes to member durations must not leave clocks running.
            if (this.state() !== CAnimationState.Stopped) this.stop();
            throw new RangeError("The total animation duration must be finite.");
        }
        return total;
    }
    /**
     * Appends an owned member after checking that the sequence duration remains finite.
     * @param animation Stopped animation with bounded duration that can be owned by this group.
     */
    override addAnimation(animation: CAbstractAnimation): void {
        if (!this.animations().includes(animation) && !Number.isFinite(this.duration() + this.memberDuration(animation)))
            throw new RangeError("The total animation duration must be finite.");
        super.addAnimation(animation);
    }
    /**
     * Looks up the member selected by the current playback position.
     * @returns The selected animation, or `null` when none is selected or the group has been destroyed.
     */
    currentAnimation(): CAbstractAnimation | null {
        return !this.isDestroyed() && this.#current !== null && this.animations().includes(this.#current)
            ? this.#current : null;
    }
    /** Reapplies the selected member's value if the member has a nonzero loop count. */
    override applyCurrentValue(): void {
        const current = this.currentAnimation();
        if (current !== null && current.loopCount() !== 0) current.applyCurrentValue();
    }
    /** Validates member durations and starts a new group run, stopping the previous run if needed. */
    override start(): void {
        if (this.isDestroyed()) return;
        this.duration(); // Validate before starting any member.
        if (this.state() !== CAnimationState.Stopped) this.stop();
        ++this.#run; super.start();
    }
    /** Stops the group and invalidates callbacks from the current run. */
    override stop(): void { ++this.#run; super.stop(); }
    /**
     * Seeks the group timeline and reapplies endpoints of passed stages when needed to restore their values.
     * @param time Finite elapsed group time in milliseconds across loops.
     */
    override setCurrentTime(time: number): void {
        const previous = this.#seeking;
        this.#seeking = true; ++this.#run;
        try { super.setCurrentTime(time); }
        finally { this.#seeking = previous; }
    }
    /**
     * Changes the sequence clock source. The sequence keeps supplying time to its members while active.
     * @param external `true` if a containing group supplies this sequence's time.
     */
    override setExternalClock(external: boolean): void {
        super.setExternalClock(external);
        // A sequence supplies time to its members even when its own clock is native.
        if (this.state() !== CAnimationState.Stopped)
            for (const animation of this.animations()) animation.setExternalClock(true);
    }
    /** Clears the selected member when it is no longer part of the sequence. */
    protected override updateAnimations(): void {
        if (this.#current !== null && !this.animations().includes(this.#current)) this.#select(null);
    }
    /** Destroys the group and its owned members and clears playback tracking. */
    override destroy(): void { super.destroy(); this.#started.clear(); this.#current = null; }
    /**
     * Stops members, clears playback tracking and clears the selected member before the next loop.
     * @param _loop New zero-based group loop index.
     * @param _previous Previous zero-based group loop index.
     */
    protected override updateCurrentLoop(_loop: number, _previous: number): void {
        const run = ++this.#run;
        for (const animation of this.animations()) {
            animation.stop();
            if (run !== this.#run || this.isDestroyed()) return;
        }
        this.#started.clear(); this.#select(null);
    }
    /**
     * Propagates the group lifecycle to its members. Running enables group-driven time, pausing pauses members, and stopping releases their clocks.
     * @param state New group state.
     * @param previous Previous group state. Starting from `Stopped` resets member playback tracking.
     */
    protected override updateState(state: CAnimationState, previous: CAnimationState): void {
        if (state === CAnimationState.Running) {
            const run = this.#run;
            if (previous === CAnimationState.Stopped) {
                this.#started.clear(); this.#select(null);
                if (!this.#valid(run) || this.state() !== state) return;
            }
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
    #valid(run: number): boolean { return run === this.#run && !this.isDestroyed(); }
    #select(animation: CAbstractAnimation | null): boolean {
        if (animation === this.#current) return false;
        this.#current = animation; this.currentAnimationChanged.emit(animation); return true;
    }
    /**
     * Selects the stage at the supplied position, applies completed stages as appropriate and drives the active member at its local time.
     * @param time Direction-adjusted position in milliseconds within one group pass.
     */
    protected override updateCurrentTime(time: number): void {
        const run = this.#run, members = this.animations().filter(animation => animation.loopCount() !== 0);
        let offset = 0;
        const segments = members.map(animation => {
            const start = offset; offset += this.memberDuration(animation);
            return { animation, start, end: offset };
        });
        const reverse = this.currentDirection() === CAnimationDirection.Backward;
        const order = segments.map((_segment, index) => index);
        if (reverse) order.reverse();
        const activeIndex = order.find(index => reverse ? time > segments[index]!.start : time < segments[index]!.end) ?? -1;
        // Future members must not overwrite a target shared with the active member.
        if (activeIndex >= 0) {
            for (const index of order.slice(order.indexOf(activeIndex) + 1)) {
                const animation = segments[index]!.animation;
                this.#started.delete(animation); animation.stop();
                if (!this.#valid(run)) return;
            }
        }
        for (const index of order) {
            if (!this.#valid(run)) return;
            const { animation, start, end } = segments[index]!;
            const passed = reverse ? time <= start : time >= end;
            if (!passed && index !== activeIndex) break;
            let activated = false;
            if (!passed || (this.state() !== CAnimationState.Stopped && !this.#started.has(animation))) {
                activated = this.#select(animation);
                if (!this.#valid(run)) return;
            }
            animation.setDrivenBackward(reverse);
            if (this.state() !== CAnimationState.Stopped) {
                animation.setExternalClock(true);
                if ((!passed || this.state() === CAnimationState.Running)
                    && (!this.#started.has(animation) || (!passed && animation.state() === CAnimationState.Stopped))) {
                    this.#started.add(animation); activated = true; animation.start();
                } else if (!passed && this.state() === CAnimationState.Running
                    && animation.state() === CAnimationState.Paused) animation.resume();
                if (!this.#valid(run)) return;
                if (this.state() === CAnimationState.Paused) animation.pause();
            }
            if (!this.#valid(run)) return;
            animation.setCurrentTime(passed ? (reverse ? 0 : this.memberDuration(animation)) : Math.max(0, time - start));
            if (!this.#valid(run)) return;
            if (passed && this.state() === CAnimationState.Paused) this.#started.add(animation);
            // A pause has no value to restore. Explicit seeks must reapply
            // earlier endpoints even if their cached values did not change.
            if (activated || (this.#seeking && passed)) animation.applyCurrentValue();
            if (!this.#valid(run)) return;
            if (!passed) break;
        }
        if (activeIndex < 0) {
            const last = (reverse ? members[0] : members[members.length - 1]) ?? null;
            const changed = this.#select(last);
            if (this.#valid(run) && (changed || this.#seeking)) last?.applyCurrentValue();
        }
    }
}
