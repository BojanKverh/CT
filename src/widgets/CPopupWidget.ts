import { CApplication } from "../core/CApplication.js";
import { CFrameShape } from "../gui/CFrameStyle.js";
import { CFrame } from "./CFrame.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CPainter } from "../painting/CPainter.js";

/** Implements the popup widget widget. */
export class CPopupWidget extends CFrame {
	#m_open = false;

	/** Creates a new instance. */
	constructor() {
		/** Provides super behavior. */
		super();
		this.setFrameShape(CFrameShape.Box);
		this.hide();
	}

	/**
	 * Checks whether the popup widget is open.
	 * @returns `true` if the popup widget is open, otherwise `false`.
	 */
	isOpen(): boolean {
		return this.#m_open;
	}

	/**
	 * Opens the take focus. May request focus.
	 * @param takeFocus Take focus flag. Defaults to `true`.
	 */
	open(takeFocus = true): void {
		/** Provides if behavior. */
		if (this.#m_open)
			return;

		this.#m_open = true;

		CApplication.instance().registerPopupWidget(this);
		this.show();
		if (takeFocus)
			this.setFocus();
	}

	/** Unregisters and hides an open popup. A closed popup is left as-is. */
	close(): void {
		/** Provides if behavior. */
		if (!this.#m_open)
			return;

		this.#m_open = false;

		CApplication.instance().unregisterPopupWidget(this);
		this.hide();
	}

}
