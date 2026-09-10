/**
 * Function type used as a slot connected to a signal.
 * @typeParam TArgs Tuple containing the signal argument types.
 */
export type CSlot<TArgs extends unknown[]> = (...args: TArgs) => void;

/**
 * Type-safe signal that invokes connected slots when emitted.
 * @typeParam TArgs Tuple containing the signal argument types.
 */
export class CSignal<TArgs extends unknown[] = []> {
    #m_slots = new Set<CSlot<TArgs>>();

/**
 * Connects a slot to the signal.
 * @param slot Slot to invoke when the signal is emitted.
 * @returns A function that disconnects the slot.
 */
    connect(slot: CSlot<TArgs>): () => void {
    	this.#m_slots.add(slot);
	    return () => {
		    this.#m_slots.delete(slot);
	    };
    }

/**
 * Disconnects a slot from the signal.
 * @param slot Previously connected slot.
 */
    disconnect(slot: CSlot<TArgs>): void {
        this.#m_slots.delete(slot);
    }

/**
 * Emits the signal and invokes all currently connected slots.
 * @param args Arguments passed to each connected slot.
 */
    emit(...args: TArgs): void {
        const slots = [...this.#m_slots];

        for (const slot of slots)
            slot(...args);
    }
}