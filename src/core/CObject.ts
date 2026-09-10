/**
 * Base class for objects that participate in the Canvas Toolkit parent-child ownership hierarchy.
 */
export class CObject {
    #m_parent: CObject | null = null;
    #m_children: CObject[] = [];

/**
 * Creates an object and optionally assigns its parent.
 * @param parent Parent object, or `null` for no parent.
 */
    constructor(parent: CObject | null = null) {
        if (parent !== null)
            this.setParent(parent);
    }

/**
 * Returns the parent object.
 * @returns The parent object, or `null` if the object has no parent.
 */
    parent(): CObject | null {
        return this.#m_parent;
    }

/**
 * Returns the direct child objects.
 * @returns A read-only view of the direct children.
 */
    children(): readonly CObject[] {
        return this.#m_children;
    }

/**
 * Destroys all child objects and detaches this object from its parent.
 */
	destroy(): void
	{
		for (const child of [...this.children()])
			child.destroy();

        this.detachFromParent();
	}

/**
 * Changes the parent of this object.
 * @param parent New parent object, or `null` to detach the object.
 * @throws Error if the operation would create a cyclic object hierarchy.
 */
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

/**
 * Detaches this object from its current parent.
 */
    protected detachFromParent(): void
	{
		if (this.#m_parent === null)
			return;

		this.#m_parent.#removeChild(this);
		this.#m_parent = null;
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