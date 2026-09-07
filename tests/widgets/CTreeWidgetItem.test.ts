import { describe, expect, test } from "vitest";

import { CTreeWidgetItem } from "../../src/widgets/CTreeWidgetItem.js";

describe("CTreeWidgetItem", () => {
	test("constructs with no text", () => {
		const item = new CTreeWidgetItem();

		expect(item.columnCount()).toBe(0);
		expect(item.text(0)).toBe("");
		expect(item.parent()).toBeNull();
		expect(item.childCount()).toBe(0);
	});

	test("constructs with column texts", () => {
		const item = new CTreeWidgetItem(["Name", "Value", "Type"]);

		expect(item.columnCount()).toBe(3);
		expect(item.text(0)).toBe("Name");
		expect(item.text(1)).toBe("Value");
		expect(item.text(2)).toBe("Type");
	});

	test("copies constructor text array", () => {
		const texts = ["A", "B"];
		const item = new CTreeWidgetItem(texts);

		texts[0] = "Changed";

		expect(item.text(0)).toBe("A");
	});

	test("text returns empty string for invalid column", () => {
		const item = new CTreeWidgetItem(["A"]);

		expect(item.text(-1)).toBe("");
		expect(item.text(1)).toBe("");
		expect(item.text(100)).toBe("");
	});

	test("setText changes existing column", () => {
		const item = new CTreeWidgetItem(["A", "B"]);

		item.setText(1, "Changed");

		expect(item.text(0)).toBe("A");
		expect(item.text(1)).toBe("Changed");
		expect(item.columnCount()).toBe(2);
	});

	test("setText creates missing columns", () => {
		const item = new CTreeWidgetItem(["A"]);

		item.setText(3, "D");

		expect(item.columnCount()).toBe(4);
		expect(item.text(0)).toBe("A");
		expect(item.text(1)).toBe("");
		expect(item.text(2)).toBe("");
		expect(item.text(3)).toBe("D");
	});

	test("setText ignores negative column", () => {
		const item = new CTreeWidgetItem(["A"]);

		item.setText(-1, "X");

		expect(item.columnCount()).toBe(1);
		expect(item.text(0)).toBe("A");
	});

	test("addChild adds child", () => {
		const parent = new CTreeWidgetItem(["Parent"]);
		const child = new CTreeWidgetItem(["Child"]);

		parent.addChild(child);

		expect(parent.childCount()).toBe(1);
		expect(parent.child(0)).toBe(child);
		expect(child.parent()).toBe(parent);
	});

	test("addChild appends children in insertion order", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const third = new CTreeWidgetItem(["Third"]);

		parent.addChild(first);
		parent.addChild(second);
		parent.addChild(third);

		expect(parent.childCount()).toBe(3);
		expect(parent.child(0)).toBe(first);
		expect(parent.child(1)).toBe(second);
		expect(parent.child(2)).toBe(third);
	});

	test("child returns null for invalid index", () => {
		const parent = new CTreeWidgetItem();
		const child = new CTreeWidgetItem();

		parent.addChild(child);

		expect(parent.child(-1)).toBeNull();
		expect(parent.child(1)).toBeNull();
		expect(parent.child(100)).toBeNull();
	});

	test("indexOfChild returns child index", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem();
		const second = new CTreeWidgetItem();

		parent.addChild(first);
		parent.addChild(second);

		expect(parent.indexOfChild(first)).toBe(0);
		expect(parent.indexOfChild(second)).toBe(1);
	});

	test("indexOfChild returns -1 for non-child", () => {
		const parent = new CTreeWidgetItem();
		const child = new CTreeWidgetItem();

		expect(parent.indexOfChild(child)).toBe(-1);
	});

	test("insertChild inserts at requested index", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		parent.addChild(first);
		parent.addChild(second);
		parent.insertChild(1, inserted);

		expect(parent.childCount()).toBe(3);
		expect(parent.child(0)).toBe(first);
		expect(parent.child(1)).toBe(inserted);
		expect(parent.child(2)).toBe(second);
		expect(inserted.parent()).toBe(parent);
	});

	test("insertChild clamps negative index to beginning", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		parent.addChild(first);
		parent.insertChild(-10, inserted);

		expect(parent.child(0)).toBe(inserted);
		expect(parent.child(1)).toBe(first);
	});

	test("insertChild clamps large index to end", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		parent.addChild(first);
		parent.insertChild(100, inserted);

		expect(parent.child(0)).toBe(first);
		expect(parent.child(1)).toBe(inserted);
	});

	test("insertChild can reorder child within same parent", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const third = new CTreeWidgetItem(["Third"]);

		parent.addChild(first);
		parent.addChild(second);
		parent.addChild(third);

		parent.insertChild(0, third);

		expect(parent.child(0)).toBe(third);
		expect(parent.child(1)).toBe(first);
		expect(parent.child(2)).toBe(second);
		expect(parent.childCount()).toBe(3);
	});

	test("child is reparented from previous parent", () => {
		const firstParent = new CTreeWidgetItem(["First parent"]);
		const secondParent = new CTreeWidgetItem(["Second parent"]);
		const child = new CTreeWidgetItem(["Child"]);

		firstParent.addChild(child);
		secondParent.addChild(child);

		expect(firstParent.childCount()).toBe(0);
		expect(secondParent.childCount()).toBe(1);
		expect(secondParent.child(0)).toBe(child);
		expect(child.parent()).toBe(secondParent);
	});

	test("removeChild removes child", () => {
		const parent = new CTreeWidgetItem();
		const child = new CTreeWidgetItem();

		parent.addChild(child);
		parent.removeChild(child);

		expect(parent.childCount()).toBe(0);
		expect(child.parent()).toBeNull();
	});

	test("removeChild ignores non-child", () => {
		const parent = new CTreeWidgetItem();
		const child = new CTreeWidgetItem();
		const other = new CTreeWidgetItem();

		parent.addChild(child);
		parent.removeChild(other);

		expect(parent.childCount()).toBe(1);
		expect(parent.child(0)).toBe(child);
		expect(child.parent()).toBe(parent);
	});

	test("takeChild removes and returns child", () => {
		const parent = new CTreeWidgetItem();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);

		parent.addChild(first);
		parent.addChild(second);

		const taken = parent.takeChild(0);

		expect(taken).toBe(first);
		expect(first.parent()).toBeNull();
		expect(parent.childCount()).toBe(1);
		expect(parent.child(0)).toBe(second);
	});

	test("takeChild returns null for invalid index", () => {
		const parent = new CTreeWidgetItem();

		expect(parent.takeChild(-1)).toBeNull();
		expect(parent.takeChild(0)).toBeNull();
		expect(parent.takeChild(100)).toBeNull();
	});

	test("cannot add item as its own child", () => {
		const item = new CTreeWidgetItem();

		item.addChild(item);

		expect(item.childCount()).toBe(0);
		expect(item.parent()).toBeNull();
	});

	test("cannot create direct parent cycle", () => {
		const parent = new CTreeWidgetItem(["Parent"]);
		const child = new CTreeWidgetItem(["Child"]);

		parent.addChild(child);
		child.addChild(parent);

		expect(parent.parent()).toBeNull();
		expect(parent.childCount()).toBe(1);
		expect(parent.child(0)).toBe(child);
		expect(child.parent()).toBe(parent);
		expect(child.childCount()).toBe(0);
	});

	test("cannot create deep parent cycle", () => {
		const root = new CTreeWidgetItem(["Root"]);
		const child = new CTreeWidgetItem(["Child"]);
		const grandChild = new CTreeWidgetItem(["Grandchild"]);

		root.addChild(child);
		child.addChild(grandChild);

		grandChild.addChild(root);

		expect(root.parent()).toBeNull();
		expect(root.child(0)).toBe(child);
		expect(child.parent()).toBe(root);
		expect(child.child(0)).toBe(grandChild);
		expect(grandChild.parent()).toBe(child);
		expect(grandChild.childCount()).toBe(0);
	});

	test("supports nested child hierarchy", () => {
		const root = new CTreeWidgetItem(["Root"]);
		const child = new CTreeWidgetItem(["Child"]);
		const grandChild = new CTreeWidgetItem(["Grandchild"]);

		root.addChild(child);
		child.addChild(grandChild);

		expect(root.childCount()).toBe(1);
		expect(child.childCount()).toBe(1);
		expect(grandChild.childCount()).toBe(0);

		expect(child.parent()).toBe(root);
		expect(grandChild.parent()).toBe(child);
	});
});