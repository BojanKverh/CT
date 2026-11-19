/** @module Widgets/CTreeWidgetItem */
/** Hierarchical row data and child ownership for CTreeWidget. */
export class CTreeWidgetItem {
	#m_texts: string[];
	#m_parent: CTreeWidgetItem | null = null;
	#m_children: CTreeWidgetItem[] = [];

    /**
    * Retains column captions and optional parent-item membership.
    * @param texts Input used to configure CTreeWidgetItem. Omit to use `[]`.
    */
    constructor(texts: string[] = []) {
		this.#m_texts = [...texts];
	}

    /**
    * Returns the text stored for one item column.
    */
    text(column: number): string {
		if (column < 0)
			return "";

		return this.#m_texts[column] ?? "";
	}

    /**
    * Changes one column's caption and notifies the owning tree model when attached.
    */
    setText(column: number, text: string): void {
		if (column < 0)
			return;

		while (this.#m_texts.length <= column)
			this.#m_texts.push("");

		this.#m_texts[column] = text;
	}

    /**
    * Returns the number of text columns retained by this item.
    */
    columnCount(): number {
		return this.#m_texts.length;
	}

    /**
    * Returns the parent tree item, or null for a root item.
    */
    parent(): CTreeWidgetItem | null {
		return this.#m_parent;
	}

    /**
    * Returns the child at a zero-based position, or null.
    */
    child(index: number): CTreeWidgetItem | null {
		return this.#m_children[index] ?? null;
	}

    /**
    * Returns the number of immediate child items.
    */
    childCount(): number {
		return this.#m_children.length;
	}

    /**
    * Returns a child's position, or -1 when it is not an immediate child.
    */
    indexOfChild(child: CTreeWidgetItem): number {
		return this.#m_children.indexOf(child);
	}

    /** Adds child. */
    addChild(child: CTreeWidgetItem): void {
		this.insertChild(this.#m_children.length, child);
	}

    /** Inserts child. */
    insertChild(index: number, child: CTreeWidgetItem): void {
		if (child === this)
			return;

		if (this.#isAncestorOf(child))
			return;

		if (child.#m_parent === this) {
			const oldIndex = this.#m_children.indexOf(child);

			if (oldIndex < 0)
				return;

			this.#m_children.splice(oldIndex, 1);

			if (oldIndex < index)
				index--;
		} else {
			child.#m_parent?.removeChild(child);
		}

		index = Math.max(0, Math.min(index, this.#m_children.length));

		this.#m_children.splice(index, 0, child);
		child.#m_parent = this;
	}

    /** Removes child. */
    removeChild(child: CTreeWidgetItem): void {
		const index = this.#m_children.indexOf(child);

		if (index < 0)
			return;

		this.takeChild(index);
	}

    /** Removes and returns child. */
    takeChild(index: number): CTreeWidgetItem | null {
		if (index < 0 || index >= this.#m_children.length)
			return null;

		const child = this.#m_children[index];

		if (child === undefined)
			return null;

		this.#m_children.splice(index, 1);
		child.#m_parent = null;

		return child;
	}

	#isAncestorOf(item: CTreeWidgetItem): boolean {
		let parent = this.#m_parent;

		while (parent !== null) {
			if (parent === item)
				return true;

			/**
			 * Returns the parent tree item, or null for a root item.
			 */
			parent = parent.#m_parent;
		}

		return false;
	}
}