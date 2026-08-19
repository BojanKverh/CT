import { CApplication } from "../core/CApplication.js";
import { CWidget } from "./CWidget.js";

export class CPopupWidget extends CWidget {
	#m_open = false;

	constructor() {
		super();

		this.hide();
	}

	isOpen(): boolean {
		return this.#m_open;
	}

	open(): void {
		if (this.#m_open)
			return;

		this.#m_open = true;
		this.show();

		CApplication.instance().registerPopupWidget(this);
	}

	close(): void {
		if (!this.#m_open)
			return;

		this.#m_open = false;

		CApplication.instance().unregisterPopupWidget(this);
		this.hide();
	}
}