import { CEvent, CEventType } from "./CEvent.js";

export class CKeyEvent extends CEvent {
	#m_key: string;
	#m_code: string;
	#m_ctrl: boolean;
	#m_shift: boolean;
	#m_alt: boolean;
	#m_meta: boolean;
	#m_altGraph: boolean;

	constructor(type: CEventType, key: string, ctrl = false,
		shift = false, alt = false, meta = false, code: string = "", altGraph = false) {
		super(type);

		this.#m_key = key;
		this.#m_code = code;
		this.#m_ctrl = ctrl;
		this.#m_shift = shift;
		this.#m_alt = alt;
		this.#m_meta = meta;
		this.#m_altGraph = altGraph;
	}

	key(): string {
		return this.#m_key;
	}

	ctrl(): boolean {
		return this.#m_ctrl;
	}

	shift(): boolean {
		return this.#m_shift;
	}

	alt(): boolean {
		return this.#m_alt;
	}

	meta(): boolean {
		return this.#m_meta;
	}

	code(): string {
		return this.#m_code;
	}

	altGraph(): boolean {
		return this.#m_altGraph;
	}
}