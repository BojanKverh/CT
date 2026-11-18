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

	/**
	 * Reads the browser key value, which can reflect the keyboard layout and modifiers.
	 * @returns The key value recorded for the event.
	 */
	key(): string {
		return this.#m_key;
	}

	/**
	 * Checks the recorded Control modifier state.
	 * @returns `true` if Control was active for the event.
	 */
	ctrl(): boolean {
		return this.#m_ctrl;
	}

	/**
	 * Checks the recorded Shift modifier state.
	 * @returns `true` if Shift was active for the event.
	 */
	shift(): boolean {
		return this.#m_shift;
	}

	/**
	 * Checks the recorded Alt modifier state.
	 * @returns `true` if Alt was active for the event.
	 */
	alt(): boolean {
		return this.#m_alt;
	}

	/**
	 * Checks the recorded Meta modifier state.
	 * @returns `true` if Meta was active for the event.
	 */
	meta(): boolean {
		return this.#m_meta;
	}

	/**
	 * Reads the physical key identifier supplied by the browser.
	 * @returns The key code, or an empty string if none was supplied.
	 */
	code(): string {
		return this.#m_code;
	}

	/**
	 * Checks the recorded AltGraph modifier state.
	 * @returns `true` if AltGraph was active for the event.
	 */
	altGraph(): boolean {
		return this.#m_altGraph;
	}
}