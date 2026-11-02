import { CAnimationState } from "./CAbstractAnimation.js";
import { CAnimationGroup } from "./CAnimationGroup.js";
import type { CAbstractAnimation } from "./CAbstractAnimation.js";

/** Runs all members together; the longest member determines the group duration.
 * Control playback through the group while its members belong to it.
 * All running members use the framework's shared animation-frame driver.
 */
export class CParallelAnimationGroup extends CAnimationGroup {
    #started = new Set<CAbstractAnimation>();
    #run = 0;
    #seeking = false;

    override duration(): number {
        let duration = 0;
        for (const animation of this.animations()) duration = Math.max(duration, animation.duration());
        return duration;
    }
    override start(): void {
        if (this.isDestroyed()) return;
        if (this.state() !== CAnimationState.Stopped) this.stop();
        ++this.#run; super.start();
    }
    override stop(): void { ++this.#run; super.stop(); }

    protected override updateState(state: CAnimationState, previous: CAnimationState): void {
        if (state === CAnimationState.Running && previous === CAnimationState.Stopped) this.#started.clear();
        for (const animation of this.animations()) {
            if (this.state() !== state) break;
            if (state === CAnimationState.Stopped) animation.stop();
            else if (this.state() === CAnimationState.Paused) animation.pause();
            else if (!this.#started.has(animation)) {
                this.#started.add(animation); animation.start();
            } else if (animation.state() === CAnimationState.Paused) animation.resume();
        }
    }
    override setCurrentTime(time: number): void {
        const wasSeeking = this.#seeking;
        this.#seeking = true; ++this.#run;
        try { super.setCurrentTime(time); }
        finally { this.#seeking = wasSeeking; }
    }
    protected override updateCurrentTime(time: number): void {
        // Members run on the shared driver. At the group's endpoint, seek every
        // member to its exact endpoint before the group emits finished; this also
        // eliminates tiny clock differences from synchronous start calls.
        if (!this.#seeking && time < this.duration()) return;
        const run = this.#run;
        for (const animation of this.animations()) {
            if (run !== this.#run) break;
            const state = this.state();
            const childTime = Math.min(time, animation.duration());
            // Seeking backwards can reactivate an already completed member.
            if (state !== CAnimationState.Stopped && childTime < animation.duration()
                && animation.state() === CAnimationState.Stopped) {
                animation.start();
                if (this.state() === CAnimationState.Paused) animation.pause();
            }
            if (run !== this.#run) break;
            animation.setCurrentTime(childTime);
        }
    }
}
