export class CTreeWidgetItem {
	#m_texts: string[];
	#m_parent: CTreeWidgetItem | null = null;
	#m_children: CTreeWidgetItem[] = [];

	constructor(texts: string[] = []) {
		this.#m_texts = [...texts];
	}

	text(column: number): string {
		if (column < 0)
			return "";

		return this.#m_texts[column] ?? "";
	}

	setText(column: number, text: string): void {
		if (column < 0)
			return;

		while (this.#m_texts.length <= column)
			this.#m_texts.push("");

		this.#m_texts[column] = text;
	}

	columnCount(): number {
		return this.#m_texts.length;
	}

	parent(): CTreeWidgetItem | null {
		return this.#m_parent;
	}

	child(index: number): CTreeWidgetItem | null {
		return this.#m_children[index] ?? null;
	}

	childCount(): number {
		return this.#m_children.length;
	}

	indexOfChild(child: CTreeWidgetItem): number {
		return this.#m_children.indexOf(child);
	}

	addChild(child: CTreeWidgetItem): void {
		this.insertChild(this.#m_children.length, child);
	}

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

	removeChild(child: CTreeWidgetItem): void {
		const index = this.#m_children.indexOf(child);

		if (index < 0)
			return;

		this.takeChild(index);
	}

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

			parent = parent.#m_parent;
		}

		return false;
	}
}