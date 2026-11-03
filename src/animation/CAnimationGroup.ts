import { CAbstractAnimation, CAnimationState } from "./CAbstractAnimation.js";
import type { CObject } from "../core/CObject.js";

/** Owns its members. Edit membership only while stopped; takeAnimation transfers ownership. */
export abstract class CAnimationGroup extends CAbstractAnimation {
    #members: CAbstractAnimation[] = [];
    #disconnect = new Map<CAbstractAnimation, () => void>();
    #destroying = false;

    animationCount(): number { return this.#members.length; }
    animationAt(index: number): CAbstractAnimation | null { return this.#members[index] ?? null; }
    protected animations(): readonly CAbstractAnimation[] { return [...this.#members]; }
    /** @internal Propagates a containing group's clock policy to nested members. */
    override setExternalClock(external: boolean): void {
        super.setExternalClock(external);
        for (const animation of this.animations()) animation.setExternalClock(external || this.state() !== CAnimationState.Stopped);
    }
    /** Allows derived groups to discard references after membership changes. */
    protected updateAnimations(): void {}
    /** Groups have finite members; repeat the containing group for an endless show. */
    protected memberDuration(animation: CAbstractAnimation): number {
        const duration = animation.totalDuration();
        if (duration < 0) {
            if (this.state() !== CAnimationState.Stopped) this.stop();
            throw new RangeError("Group members must have finite total durations. Loop the containing group instead.");
        }
        return duration;
    }
    abstract override duration(): number;
    /** A group's duration is derived from its members. */
    override setDuration(_duration: number): void { throw new Error("Set durations on the group's animations."); }

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

    takeAnimation(index: number): CAbstractAnimation | null {
        this.#checkEditable();
        const animation = this.animationAt(index);
        if (animation !== null) this.#detach(animation);
        return animation;
    }
    removeAnimation(animation: CAbstractAnimation): boolean {
        this.#checkEditable();
        if (!this.#members.includes(animation)) return false;
        this.#detach(animation); return true;
    }
    /** Destroys all members. Use takeAnimation to retain a member instead. */
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
    override destroy(): void {
        if (this.#destroying || this.isDestroyed()) return;
        this.#destroying = true;
        for (const disconnect of this.#disconnect.values()) disconnect();
        this.#disconnect.clear();
        super.destroy(); this.#members = [];
    }
}
