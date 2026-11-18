/** Implements the tree widget item widget. */
export class CTreeWidgetItem {
	#m_texts: string[];
	#m_parent: CTreeWidgetItem | null = null;
	#m_children: CTreeWidgetItem[] = [];

	/** Creates a new instance. */
	constructor(texts: string[] = []) {
		this.#m_texts = [...texts];
	}

	/**
	 * Reads the display text stored for a column.
	 * @param column Zero-based column.
	 * @returns Column text, or an empty string if none is stored.
	 */
	text(column: number): string {
		/** Provides if behavior. */
		if (column < 0)
			return "";

		return this.#m_texts[column] ?? "";
	}

	/**
	 * Stores display text in a column, filling intervening columns with empty strings as needed.
	 * @param column Nonnegative zero-based column index.
	 * @param text Text to display in that column.
	 */
	setText(column: number, text: string): void {
		/** Provides if behavior. */
		if (column < 0)
			return;

		/** Provides while behavior. */
		while (this.#m_texts.length <= column)
			this.#m_texts.push("");

		this.#m_texts[column] = text;
	}

	/**
	 * Reads the number of entries in the texts.
	 * @returns The number of entries in the texts.
	 */
	columnCount(): number {
		return this.#m_texts.length;
	}

	/**
	 * Reads the parent.
	 * @returns The parent.
	 */
	parent(): CTreeWidgetItem | null {
		return this.#m_parent;
	}

	/**
	 * Looks up an immediate child.
	 * @param index Zero-based child index.
	 * @returns The child, or `null` if absent.
	 */
	child(index: number): CTreeWidgetItem | null {
		return this.#m_children[index] ?? null;
	}

	/**
	 * Reads the number of entries in the children.
	 * @returns The number of entries in the children.
	 */
	childCount(): number {
		return this.#m_children.length;
	}

	/**
	 * Finds an immediate child by identity.
	 * @param child Child item to look up.
	 * @returns Zero-based child index, or `-1` if absent.
	 */
	indexOfChild(child: CTreeWidgetItem): number {
		return this.#m_children.indexOf(child);
	}

	/**
	 * Adds child.
	 * @param child Child.
	 */
	addChild(child: CTreeWidgetItem): void {
		this.insertChild(this.#m_children.length, child);
	}

	/**
	 * Inserts child.
	 * @param index Zero-based item index.
	 * @param child Child.
	 */
	insertChild(index: number, child: CTreeWidgetItem): void {
		/** Provides if behavior. */
		if (child === this)
			return;

		/** Provides if behavior. */
		if (this.#isAncestorOf(child))
			return;

		/** Provides if behavior. */
		if (child.#m_parent === this) {
			const oldIndex = this.#m_children.indexOf(child);

			/** Provides if behavior. */
			if (oldIndex < 0)
				return;

			this.#m_children.splice(oldIndex, 1);

			/** Provides if behavior. */
			if (oldIndex < index)
				index--;
		} else {
			child.#m_parent?.removeChild(child);
		}

		index = Math.max(0, Math.min(index, this.#m_children.length));

		this.#m_children.splice(index, 0, child);
		child.#m_parent = this;
	}

	/**
	 * Removes child.
	 * @param child Child.
	 */
	removeChild(child: CTreeWidgetItem): void {
		const index = this.#m_children.indexOf(child);

		/** Provides if behavior. */
		if (index < 0)
			return;

		this.takeChild(index);
	}

	/**
	 * Removes an immediate child and clears its parent link.
	 * @param index Zero-based child index.
	 * @returns Detached item, or `null` for an invalid or absent position.
	 */
	takeChild(index: number): CTreeWidgetItem | null {
		/** Provides if behavior. */
		if (index < 0 || index >= this.#m_children.length)
			return null;

		const child = this.#m_children[index];

		/** Provides if behavior. */
		if (child === undefined)
			return null;

		this.#m_children.splice(index, 1);
		child.#m_parent = null;

		return child;
	}

	#isAncestorOf(item: CTreeWidgetItem): boolean {
		let parent = this.#m_parent;

		/** Provides while behavior. */
		while (parent !== null) {
			/** Provides if behavior. */
			if (parent === item)
				return true;

			parent = parent.#m_parent;
		}

		return false;
	}
}