export class CObject {
    #m_parent: CObject | null = null;
    #m_children: CObject[] = [];

    constructor(parent: CObject | null = null) {
        if (parent !== null)
            this.setParent(parent);
    }

    parent(): CObject | null {
        return this.#m_parent;
    }

    children(): readonly CObject[] {
        return this.#m_children;
    }

    setParent(parent: CObject | null): void {
        if (parent === this)
            throw new Error("An object cannot be its own parent.");

        if (parent !== null && this.#isAncestorOf(parent))
            throw new Error("Cannot create a cyclic object hierarchy.");

        if (this.#m_parent === parent)
            return;

        if (this.#m_parent !== null)
            this.#m_parent.#removeChild(this);

        this.#m_parent = parent;

        if (this.#m_parent !== null)
            this.#m_parent.#addChild(this);
    }

    #addChild(child: CObject): void {
        this.#m_children.push(child);
    }

    #removeChild(child: CObject): void {
        const index = this.#m_children.indexOf(child);

        if (index !== -1)
            this.#m_children.splice(index, 1);
    }

    #isAncestorOf(object: CObject): boolean {
        let current: CObject | null = object;

        while (current !== null) {
            if (current === this)
                return true;

            current = current.parent();
        }

        return false;
    }
}