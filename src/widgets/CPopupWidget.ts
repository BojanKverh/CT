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

	/** Returns whether the open condition is active. */
	isOpen(): boolean {
		return this.#m_open;
	}

	/** Provides open behavior. */
	open(): void {
		/** Provides if behavior. */
		if (this.#m_open)
			return;

		this.#m_open = true;

		CApplication.instance().registerPopupWidget(this);
		this.show();
		this.setFocus();
	}

	/** Provides close behavior. */
	close(): void {
		/** Provides if behavior. */
		if (!this.#m_open)
			return;

		this.#m_open = false;

		CApplication.instance().unregisterPopupWidget(this);
		this.hide();
	}

}