import { describe, expect, test } from "vitest";
import { CObject } from "../../src/core/CObject";

describe("CObject", () => {
    test("creates an object without a parent", () => {
        const object = new CObject();

        expect(object.parent()).toBeNull();
        expect(object.children()).toHaveLength(0);
    });

    test("creates an object with a parent", () => {
        const parent = new CObject();
        const child = new CObject(parent);

        expect(child.parent()).toBe(parent);
        expect(parent.children()).toContain(child);
    });

    test("changes parent", () => {
        const parent1 = new CObject();
        const parent2 = new CObject();
        const child = new CObject(parent1);

        child.setParent(parent2);

        expect(child.parent()).toBe(parent2);

        expect(parent1.children()).not.toContain(child);
        expect(parent2.children()).toContain(child);
    });

    test("removes parent", () => {
        const parent = new CObject();
        const child = new CObject(parent);

        child.setParent(null);

        expect(child.parent()).toBeNull();
        expect(parent.children()).not.toContain(child);
    });

    test("does nothing when setting the same parent", () => {
        const parent = new CObject();
        const child = new CObject(parent);

        child.setParent(parent);

        expect(child.parent()).toBe(parent);
        expect(parent.children()).toHaveLength(1);
        expect(parent.children()[0]).toBe(child);
    });

    test("prevents an object from becoming its own parent", () => {
        const object = new CObject();

        expect(() => {
            object.setParent(object);
        }).toThrow("An object cannot be its own parent.");
    });

    test("prevents cyclic object hierarchy", () => {
        const a = new CObject();
        const b = new CObject(a);
        const c = new CObject(b);

        expect(() => {
            a.setParent(c);
        }).toThrow("Cannot create a cyclic object hierarchy.");

        expect(a.parent()).toBeNull();
        expect(b.parent()).toBe(a);
        expect(c.parent()).toBe(b);
    });

    test("keeps hierarchy unchanged when cyclic parenting is rejected", () => {
        const root = new CObject();
        const child = new CObject(root);
        const grandchild = new CObject(child);

        expect(() => {
            root.setParent(grandchild);
        }).toThrow();

        expect(root.parent()).toBeNull();

        expect(root.children()).toEqual([
            child
        ]);

        expect(child.children()).toEqual([
            grandchild
        ]);

        expect(grandchild.children()).toHaveLength(0);
    });

    test("supports multiple children", () => {
        const parent = new CObject();

        const child1 = new CObject(parent);
        const child2 = new CObject(parent);
        const child3 = new CObject(parent);

        expect(parent.children()).toEqual([
            child1,
            child2,
            child3
        ]);
    });

    test("reparents an object without modifying its subtree", () => {
        const parent1 = new CObject();
        const parent2 = new CObject();
        const child = new CObject(parent1);
        const grandchild1 = new CObject(child);
        const grandchild2 = new CObject(child);

        child.setParent(parent2);

        expect(child.parent()).toBe(parent2);

        expect(parent1.children()).not.toContain(child);
        expect(parent2.children()).toContain(child);

        expect(child.children()).toEqual([ grandchild1, grandchild2 ]);

        expect(grandchild1.parent()).toBe(child);
        expect(grandchild2.parent()).toBe(child);
    });
});