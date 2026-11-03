import { CAnimationState, CAnimationDirection } from "./CAbstractAnimation.js";
import { CAnimationGroup } from "./CAnimationGroup.js";
import type { CAbstractAnimation } from "./CAbstractAnimation.js";

/** Runs finite members together, including their loops. The group supplies one clock. */
export class CParallelAnimationGroup extends CAnimationGroup {
    #started = new Set<CAbstractAnimation>();
    #run = 0;

    override duration(): number {
        let duration = 0;
        for (const animation of this.animations()) duration = Math.max(duration, this.memberDuration(animation));
        return duration;
    }
    override applyCurrentValue(): void {
        if (!this.isDestroyed()) for (const animation of this.animations())
            if (animation.loopCount() !== 0) animation.applyCurrentValue();
    }
    override start(): void {
        if (this.isDestroyed()) return;
        this.duration();
        if (this.state() !== CAnimationState.Stopped) this.stop();
        ++this.#run; super.start();
    }
    override stop(): void { ++this.#run; super.stop(); }
    override setCurrentTime(time: number): void { ++this.#run; super.setCurrentTime(time); }
    override destroy(): void { super.destroy(); this.#started.clear(); }
    protected override updateCurrentLoop(_loop: number, _previous: number): void {
        const run = ++this.#run;
        for (const animation of this.animations()) {
            animation.stop();
            if (run !== this.#run || this.isDestroyed()) return;
        }
        this.#started.clear();
    }
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
