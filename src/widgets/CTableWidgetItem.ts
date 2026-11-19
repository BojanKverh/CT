/** @module Widgets/CTableWidgetItem */
/** Cell text, editability and presentation metadata for a CTableWidget. */
export class CTableWidgetItem {
	#m_data: unknown;
	#m_editable = true;

    /**
    * Retains a caption for later insertion into an item-model cell.
    * @param data Input used to configure CTableWidgetItem. Omit to use `""`.
    */
    constructor(data: unknown = "") {
		this.#m_data = data;
	}

    /**
    * Returns the cell caption stored by this item.
    */
    text(): string {
		return this.#m_data === null || this.#m_data === undefined
			? ""
			: String(this.#m_data);
	}

    /**
    * Changes the cell caption and notifies the owning item model.
    */
    setText(text: string): void {
		this.#m_data = text;
	}

    /** Returns the value stored by the item. */
    data(): unknown {
		return this.#m_data;
	}

    /** Sets the value stored by the item. */
    setData(data: unknown): void {
		this.#m_data = data;
	}

    /**
    * Whether direct user editing is enabled.
    * The initial value is `true`.
    */
    isEditable(): boolean {
		return this.#m_editable;
	}

    /** Sets whether the item can be edited. */
    setEditable(editable: boolean = true): void {
		this.#m_editable = editable;
	}
}
