export class CEvent {
    #m_accepted = true;

    isAccepted(): boolean {
        return this.#m_accepted;
    }

    accept(): void {
        this.#m_accepted = true;
    }

    ignore(): void {
        this.#m_accepted = false;
    }
}