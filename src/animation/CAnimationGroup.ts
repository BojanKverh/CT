import { CAbstractAnimation, CAnimationState } from "./CAbstractAnimation.js";
import type { CObject } from "../core/CObject.js";

/** Owns its members. Edit membership only while stopped; takeAnimation transfers ownership. */
export abstract class CAnimationGroup extends CAbstractAnimation {
    #members: CAbstractAnimation[] = [];
    #disconnect = new Map<CAbstractAnimation, () => void>();
    #destroying = false;

    /**
     * Counts the animations owned by the group.
     * @returns Current number of members.
     */
    animationCount(): number { return this.#members.length; }
    /**
     * Looks up an animation without changing membership.
     * @param index Zero-based position in insertion order.
     * @returns The member at that position, or `null` if absent.
     */
    animationAt(index: number): CAbstractAnimation | null { return this.#members[index] ?? null; }
    /**
     * Provides a snapshot of the current membership to derived groups.
     * @returns A shallow read-only array in insertion order.
     */
    protected animations(): readonly CAbstractAnimation[] { return [...this.#members]; }
    /**
     * Changes the group's clock source and propagates external driving to members while the group is active or externally driven.
     * @param external `true` to let a containing group supply time.
     * @internal
     */
    override setExternalClock(external: boolean): void {
        super.setExternalClock(external);
        for (const animation of this.animations()) animation.setExternalClock(external || this.state() !== CAnimationState.Stopped);
    }
    /** Provides a hook for derived groups to refresh state after the member list changes. */
    protected updateAnimations(): void {}
    /**
     * Reads and validates the total duration of a member. For an unbounded member it stops an active group and throws `RangeError`.
     * @param animation Member to measure, including its configured loops.
     * @returns Finite total member duration in milliseconds.
     */
    protected memberDuration(animation: CAbstractAnimation): number {
        const duration = animation.totalDuration();
        if (duration < 0) {
            if (this.state() !== CAnimationState.Stopped) this.stop();
            throw new RangeError("Group members must have finite total durations. Loop the containing group instead.");
        }
        return duration;
    }
    /**
     * Computes the length of one group pass from the member timelines.
     * @returns Single-pass group duration in milliseconds.
     */
    abstract override duration(): number;
    /**
     * Rejects explicit group duration changes. Configure the member durations instead.
     * @param _duration Requested duration. The group always throws and leaves its duration derived from the members.
     */
    override setDuration(_duration: number): void { throw new Error("Set durations on the group's animations."); }

    /**
     * Appends an animation and transfers its ownership to this group. Adding an existing member has no effect. Membership changes require a stopped group.
     * @param animation Stopped, live animation with finite total duration. It cannot belong to another group or create an ownership cycle.
     */
    addAnimation(animation: CAbstractAnimation): void {
        this.#checkEditable();
        this.memberDuration(animation);
        if (this.#members.includes(animation)) return;
        if (animation.isDestroyed()) throw new Error("Cannot add a destroyed animation.");
        if (animation.state() !== CAnimationState.Stopped) throw new Error("Stop the animation before adding it.");
        for (let owner: CObject | null = this; owner !== null; owner = owner.parent()) {
            if (owner === animation) throw new Error("Animation groups cannot form cycles.");
        }
        if (animation.parent() instanceof CAnimationGroup && animation.parent() !== this)
            throw new Error("Take the animation out of its current group first.");
        animation.setParent(this);
        this.#members.push(animation);
        if (this.isExternallyDriven()) animation.setExternalClock(true);
        this.#disconnect.set(animation, animation.destroyed.connect(() => {
            if (this.#destroying) return;
            // A destroyed member cannot continue participating in this run.
            this.stop();
            this.#detach(animation);
        }));
        this.updateAnimations();
    }

    /**
     * Detaches a member and releases its external clock without destroying it. Membership changes require a stopped group.
     * @param index Zero-based member index.
     * @returns The detached animation, or `null` for an absent index.
     */
    takeAnimation(index: number): CAbstractAnimation | null {
        this.#checkEditable();
        const animation = this.animationAt(index);
        if (animation !== null) this.#detach(animation);
        return animation;
    }
    /**
     * Detaches a member and releases its external clock without destroying it. Throws if the group cannot be edited in its current state.
     * @param animation Animation to detach.
     * @returns `true` if the animation was a member and was removed.
     */
    removeAnimation(animation: CAbstractAnimation): boolean {
        this.#checkEditable();
        if (!this.#members.includes(animation)) return false;
        this.#detach(animation); return true;
    }
    /** Detaches and destroys all members. The group must be stopped. */
    clear(): void {
        this.#checkEditable();
        for (const animation of [...this.#members]) { this.#detach(animation); animation.destroy(); }
    }
    #detach(animation: CAbstractAnimation): void {
        this.#disconnect.get(animation)?.(); this.#disconnect.delete(animation);
        this.#members = this.#members.filter(member => member !== animation);
        if (animation.parent() === this) animation.setParent(null);
        animation.setExternalClock(false);
        this.updateAnimations();
    }
    #checkEditable(): void {
        if (this.#destroying || this.isDestroyed()) throw new Error("Animation group has been destroyed.");
        if (this.state() !== CAnimationState.Stopped) throw new Error("Stop the group before changing its members.");
    }
    /** Disconnects member callbacks, stops playback and destroys the owned animations. */
    override destroy(): void {
        if (this.#destroying || this.isDestroyed()) return;
        this.#destroying = true;
        for (const disconnect of this.#disconnect.values()) disconnect();
        this.#disconnect.clear();
        super.destroy(); this.#members = [];
    }
}
