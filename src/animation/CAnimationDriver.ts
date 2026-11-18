/** @internal One scheduler shared by all running animations. No application is required. */
export class CAnimationDriver {
    static #ticks = new Set<(now: number) => void>();
    static #cancel: (() => void) | null = null;
    static #dispatching = false;
    static #ticket = 0;

    /**
     * Reads the monotonic clock used for playback.
     * @returns Current timestamp in milliseconds on the `performance.now()` time base.
     */
    static now(): number { return performance.now(); }

    /**
     * Registers a callback for shared frame ticks and starts scheduling when needed.
     * @param tick Callback receiving the frame timestamp in milliseconds.
     * @returns A function that unregisters the callback and cancels scheduling if no callbacks remain.
     */
    static add(tick: (now: number) => void): () => void {
        this.#ticks.add(tick);
        this.#schedule();
        return () => {
            this.#ticks.delete(tick);
            if (this.#ticks.size === 0) { this.#cancel?.(); this.#cancel = null; }
        };
    }

    static #schedule(): void {
        if (this.#cancel !== null || this.#dispatching || this.#ticks.size === 0) return;
        const ticket = ++this.#ticket;
        const step = (now: number): void => {
            if (ticket !== this.#ticket) return;
            this.#cancel = null;
            this.#dispatching = true;
            try {
                for (const tick of [...this.#ticks]) {
                    if (!this.#ticks.has(tick)) continue;
                    try { tick(now); }
                    catch (error) { queueMicrotask(() => { throw error; }); }
                }
            } finally { this.#dispatching = false; this.#schedule(); }
        };
        if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
            const id = requestAnimationFrame(step);
            this.#cancel = () => { ++this.#ticket; cancelAnimationFrame(id); };
        } else {
            const id = setTimeout(() => step(this.now()), 16);
            this.#cancel = () => { ++this.#ticket; clearTimeout(id); };
        }
    }
}
