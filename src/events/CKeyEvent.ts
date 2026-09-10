import { CEvent, CEventType } from "./CEvent.js";

/** Event describing a keyboard key press or release. */
export class CKeyEvent extends CEvent {
	#m_key: string;
	#m_code: string;
	#m_ctrl: boolean;
	#m_shift: boolean;
	#m_alt: boolean;
	#m_meta: boolean;
	#m_altGraph: boolean;

	/** Creates a keyboard event.
	 * @param type Keyboard event type.
	 * @param key Key value reported by the browser.
	 * @param ctrl Whether Control is pressed.
	 * @param shift Whether Shift is pressed.
	 * @param alt Whether Alt is pressed.
	 * @param meta Whether Meta is pressed.
	 * @param code Physical key code reported by the browser.
	 * @param altGraph Whether AltGraph is active.
	 */
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

	/** Returns the key value. */
	key(): string {
		return this.#m_key;
	}

	/** Returns whether Control is pressed. */
	ctrl(): boolean {
		return this.#m_ctrl;
	}

	/** Returns whether Shift is pressed. */
	shift(): boolean {
		return this.#m_shift;
	}

	/** Returns whether Alt is pressed. */
	alt(): boolean {
		return this.#m_alt;
	}

	/** Returns whether Meta is pressed. */
	meta(): boolean {
		return this.#m_meta;
	}

	/** Returns the physical key code. */
	code(): string {
		return this.#m_code;
	}

	/** Returns whether AltGraph is active. */
	altGraph(): boolean {
		return this.#m_altGraph;
	}
}