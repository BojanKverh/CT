export type CSlot<TArgs extends unknown[]> = (...args: TArgs) => void;

export class CSignal<TArgs extends unknown[] = []> {
    #m_slots = new Set<CSlot<TArgs>>();

    connect(slot: CSlot<TArgs>): () => void {
    	this.#m_slots.add(slot);
	    return () => {
		    this.#m_slots.delete(slot);
	    };
    }

    disconnect(slot: CSlot<TArgs>): void {
        this.#m_slots.delete(slot);
    }

    emit(...args: TArgs): void {
        const slots = [...this.#m_slots];

        for (const slot of slots)
            slot(...args);
    }
}