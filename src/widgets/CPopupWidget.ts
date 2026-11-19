/** @module Widgets/CPopupWidget */
import { CApplication } from "../core/CApplication.js";
import { CFrameShape } from "../gui/CFrameStyle.js";
import { CFrame } from "./CFrame.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CPainter } from "../painting/CPainter.js";

/** Base popup window registered with application stacking and focus restoration. */
export class CPopupWidget extends CFrame {
	#m_open = false;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    */
    constructor() {
		super();
		this.setFrameShape(CFrameShape.Box);
		this.hide();
	}

    /**
    * Reports whether this popup is registered as open.
    */
    isOpen(): boolean {
		return this.#m_open;
	}

    /**
    * Registers and shows the popup, optionally transferring focus into it.
    */
    open(takeFocus = true): void {
		if (this.#m_open)
			return;

		this.#m_open = true;

		CApplication.instance().registerPopupWidget(this);
		this.show();
		if (takeFocus)
			this.setFocus();
	}

    /**
    * Unregisters and hides the popup, restoring preceding focus when appropriate.
    */
    close(): void {
		if (!this.#m_open)
			return;

		this.#m_open = false;

		CApplication.instance().unregisterPopupWidget(this);
		this.hide();
	}

}
