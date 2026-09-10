/** Implements the tree widget item widget. */
export class CTreeWidgetItem {
	#m_texts: string[];
	#m_parent: CTreeWidgetItem | null = null;
	#m_children: CTreeWidgetItem[] = [];

	/** Creates a new instance. */
	constructor(texts: string[] = []) {
		this.#m_texts = [...texts];
	}

	/** Provides text behavior. */
	text(column: number): string {
		/** Provides if behavior. */
		if (column < 0)
			return "";

		return this.#m_texts[column] ?? "";
	}

	/** Sets the text. */
	setText(column: number, text: string): void {
		/** Provides if behavior. */
		if (column < 0)
			return;

		/** Provides while behavior. */
		while (this.#m_texts.length <= column)
			this.#m_texts.push("");

		this.#m_texts[column] = text;
	}

	/** Provides column count behavior. */
	columnCount(): number {
		return this.#m_texts.length;
	}

	/** Provides parent behavior. */
	parent(): CTreeWidgetItem | null {
		return this.#m_parent;
	}

	/** Provides child behavior. */
	child(index: number): CTreeWidgetItem | null {
		return this.#m_children[index] ?? null;
	}

	/** Provides child count behavior. */
	childCount(): number {
		return this.#m_children.length;
	}

	/** Provides index of child behavior. */
	indexOfChild(child: CTreeWidgetItem): number {
		return this.#m_children.indexOf(child);
	}

	/** Adds child. */
	addChild(child: CTreeWidgetItem): void {
		this.insertChild(this.#m_children.length, child);
	}

	/** Inserts child. */
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

	/** Removes child. */
	removeChild(child: CTreeWidgetItem): void {
		const index = this.#m_children.indexOf(child);

		/** Provides if behavior. */
		if (index < 0)
			return;

		this.takeChild(index);
	}

	/** Removes and returns child. */
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