import { CObject } from "./CObject.js";
import { CSignal } from "./CSignal.js";
import { CMimeData } from "./CMimeData.js";

export class CClipboard extends CObject {
	readonly changed = new CSignal();
	readonly dataChanged = new CSignal();

	#m_mimeData: CMimeData | null = null;

	mimeData(): CMimeData | null {
		return this.#m_mimeData;
	}

	setMimeData(mimeData: CMimeData | null): void {
		if (mimeData === this.#m_mimeData)
			return;

		if (this.#m_mimeData !== null)
			this.#m_mimeData.destroy();

		this.#m_mimeData = mimeData;

		if (mimeData !== null)
			mimeData.setParent(this);

		this.dataChanged.emit();
		this.changed.emit();
	}

	text(): string {
		return this.#m_mimeData?.text() ?? "";
	}

	setText(text: string): void {
		const mimeData = new CMimeData();
		mimeData.setText(text);
		this.setMimeData(mimeData);
	}

	clear(): void {
		this.setMimeData(null);
	}
}