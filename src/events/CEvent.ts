export enum CEventType {
    MousePress,
    MouseRelease,
    MouseMove
}

export class CEvent {
    #m_type: CEventType;
    #m_accepted = true;

    constructor(type: CEventType) {
        this.#m_type = type;
    }

    type(): CEventType {
        return this.#m_type;
    }

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
