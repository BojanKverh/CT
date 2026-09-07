import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CTreeWidget } from "../../src/widgets/CTreeWidget.js";
import { CTreeWidgetItem } from "../../src/widgets/CTreeWidgetItem.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CTreeWidget", () => {
	let app: CApplication;

    beforeEach(() => {
        new CApplication(createTestCanvas());
    });
    
    afterEach(() => {
        if (CApplication.exists())
            CApplication.instance().destroy();
    });

	test("constructs empty", () => {
		const tree = new CTreeWidget();

		expect(tree.topLevelItemCount()).toBe(0);
		expect(tree.currentItem()).toBeNull();
		expect(tree.selectedItems()).toEqual([]);
	});

	test("adds top level item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);

		expect(tree.topLevelItemCount()).toBe(1);
		expect(tree.topLevelItem(0)).toBe(item);
	});

	test("adds multiple top level items in order", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const third = new CTreeWidgetItem(["Third"]);

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);
		tree.addTopLevelItem(third);

		expect(tree.topLevelItemCount()).toBe(3);
		expect(tree.topLevelItem(0)).toBe(first);
		expect(tree.topLevelItem(1)).toBe(second);
		expect(tree.topLevelItem(2)).toBe(third);
	});

	test("topLevelItem returns null for invalid index", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);

		expect(tree.topLevelItem(-1)).toBeNull();
		expect(tree.topLevelItem(1)).toBeNull();
		expect(tree.topLevelItem(100)).toBeNull();
	});

	test("insertTopLevelItem inserts at requested index", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);
		tree.insertTopLevelItem(1, inserted);

		expect(tree.topLevelItemCount()).toBe(3);
		expect(tree.topLevelItem(0)).toBe(first);
		expect(tree.topLevelItem(1)).toBe(inserted);
		expect(tree.topLevelItem(2)).toBe(second);
	});

	test("insertTopLevelItem clamps negative index to beginning", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		tree.addTopLevelItem(first);
		tree.insertTopLevelItem(-10, inserted);

		expect(tree.topLevelItem(0)).toBe(inserted);
		expect(tree.topLevelItem(1)).toBe(first);
	});

	test("insertTopLevelItem clamps large index to end", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const inserted = new CTreeWidgetItem(["Inserted"]);

		tree.addTopLevelItem(first);
		tree.insertTopLevelItem(100, inserted);

		expect(tree.topLevelItem(0)).toBe(first);
		expect(tree.topLevelItem(1)).toBe(inserted);
	});

	test("insertTopLevelItem can reorder existing top level item", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const third = new CTreeWidgetItem(["Third"]);

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);
		tree.addTopLevelItem(third);

		tree.insertTopLevelItem(0, third);

		expect(tree.topLevelItemCount()).toBe(3);
		expect(tree.topLevelItem(0)).toBe(third);
		expect(tree.topLevelItem(1)).toBe(first);
		expect(tree.topLevelItem(2)).toBe(second);
	});

	test("adding child item as top level detaches it from parent", () => {
		const tree = new CTreeWidget();
		const parent = new CTreeWidgetItem(["Parent"]);
		const child = new CTreeWidgetItem(["Child"]);

		parent.addChild(child);
		tree.addTopLevelItem(child);

		expect(parent.childCount()).toBe(0);
		expect(child.parent()).toBeNull();
		expect(tree.topLevelItem(0)).toBe(child);
	});

	test("takeTopLevelItem removes and returns item", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);

		const taken = tree.takeTopLevelItem(0);

		expect(taken).toBe(first);
		expect(tree.topLevelItemCount()).toBe(1);
		expect(tree.topLevelItem(0)).toBe(second);
	});

	test("takeTopLevelItem returns null for invalid index", () => {
		const tree = new CTreeWidget();

		expect(tree.takeTopLevelItem(-1)).toBeNull();
		expect(tree.takeTopLevelItem(0)).toBeNull();
		expect(tree.takeTopLevelItem(100)).toBeNull();
	});

	test("indexOfTopLevelItem returns item index", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);

		expect(tree.indexOfTopLevelItem(first)).toBe(0);
		expect(tree.indexOfTopLevelItem(second)).toBe(1);
	});

	test("indexOfTopLevelItem returns -1 for non top level item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Item"]);

		expect(tree.indexOfTopLevelItem(item)).toBe(-1);
	});

	test("indexFromItem returns valid index for top level item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);

		const index = tree.indexFromItem(item);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(0);
		expect(index.column()).toBe(0);
		expect(index.data()).toBe(item);
	});

	test("indexFromItem returns correct column", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["A", "B", "C"]);

		tree.addTopLevelItem(item);

		const index = tree.indexFromItem(item, 2);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(0);
		expect(index.column()).toBe(2);
		expect(index.data()).toBe(item);
	});

	test("indexFromItem returns invalid index for item not in tree", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Item"]);

		const index = tree.indexFromItem(item);

		expect(index.isValid()).toBe(false);
	});

	test("indexFromItem returns invalid index for invalid column", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["A"]);

		tree.addTopLevelItem(item);

		expect(tree.indexFromItem(item, -1).isValid()).toBe(false);
		expect(tree.indexFromItem(item, 1).isValid()).toBe(false);
	});

	test("itemFromIndex returns top level item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);

		const index = tree.indexFromItem(item);

		expect(tree.itemFromIndex(index)).toBe(item);
	});

	test("itemFromIndex returns null for invalid index", () => {
		const tree = new CTreeWidget();

		expect(tree.itemFromIndex(new CModelIndex())).toBeNull();
	});

	test("maps nested child item to model index", () => {
		const tree = new CTreeWidget();
		const root = new CTreeWidgetItem(["Root"]);
		const child = new CTreeWidgetItem(["Child"]);

		root.addChild(child);
		tree.addTopLevelItem(root);

		const index = tree.indexFromItem(child);

		expect(index.isValid()).toBe(true);
		expect(index.row()).toBe(0);
		expect(index.column()).toBe(0);
		expect(index.data()).toBe(child);
		expect(tree.itemFromIndex(index)).toBe(child);
	});

	test("maps deeply nested item to model index", () => {
		const tree = new CTreeWidget();
		const root = new CTreeWidgetItem(["Root"]);
		const child = new CTreeWidgetItem(["Child"]);
		const grandChild = new CTreeWidgetItem(["Grandchild"]);

		root.addChild(child);
		child.addChild(grandChild);
		tree.addTopLevelItem(root);

		const index = tree.indexFromItem(grandChild);

		expect(index.isValid()).toBe(true);
		expect(index.data()).toBe(grandChild);
		expect(tree.itemFromIndex(index)).toBe(grandChild);
	});

	test("setCurrentItem sets current item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);
		tree.setCurrentItem(item);

		expect(tree.currentItem()).toBe(item);
	});

	test("setCurrentItem selects requested column", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["A", "B"]);

		tree.addTopLevelItem(item);
		tree.setCurrentItem(item, 1);

		expect(tree.currentItem()).toBe(item);
		expect(tree.currentIndex().column()).toBe(1);
	});

	test("setCurrentItem ignores item not in tree", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Item"]);

		tree.setCurrentItem(item);

		expect(tree.currentItem()).toBeNull();
		expect(tree.currentIndex().isValid()).toBe(false);
	});

	test("setCurrentItem null clears current item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);
		tree.setCurrentItem(item);
		tree.setCurrentItem(null);

		expect(tree.currentItem()).toBeNull();
		expect(tree.currentIndex().isValid()).toBe(false);
	});

	test("currentItemChanged is emitted when current item changes", () => {
		const tree = new CTreeWidget();
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);
		const changes: Array<
			[CTreeWidgetItem | null, CTreeWidgetItem | null]
		> = [];

		tree.addTopLevelItem(first);
		tree.addTopLevelItem(second);

		tree.currentItemChanged.connect((current, previous) => {
			changes.push([current, previous]);
		});

		tree.setCurrentItem(first);
		tree.setCurrentItem(second);

		expect(changes).toEqual([
			[first, null],
			[second, first]
		]);
	});

	test("selectedItems returns selected item", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(item);

		const index = tree.indexFromItem(item);

		tree.selectionModel()?.select(index);

		expect(tree.selectedItems()).toEqual([item]);
	});

	test("selectedItems removes duplicate item from multiple columns", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["A", "B"]);

		tree.addTopLevelItem(item);

		tree.selectionModel()?.select(tree.indexFromItem(item, 0));
		tree.selectionModel()?.select(tree.indexFromItem(item, 1));

		expect(tree.selectedItems()).toEqual([item]);
	});

	test("setHeaderLabels changes horizontal header data", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["A", "B"]);

		tree.addTopLevelItem(item);
		tree.setHeaderLabels(["Name", "Value"]);

		expect(
			tree.model()?.headerData(0, tree.header().orientation())
		).toBe("Name");

		expect(
			tree.model()?.headerData(1, tree.header().orientation())
		).toBe("Value");
	});

	test("model exposes item text as data", () => {
		const tree = new CTreeWidget();
		const item = new CTreeWidgetItem(["Name", "Value"]);

		tree.addTopLevelItem(item);

		const first = tree.indexFromItem(item, 0);
		const second = tree.indexFromItem(item, 1);

		expect(tree.model()?.data(first)).toBe("Name");
		expect(tree.model()?.data(second)).toBe("Value");
	});

	test("model exposes child hierarchy", () => {
		const tree = new CTreeWidget();
		const root = new CTreeWidgetItem(["Root"]);
		const first = new CTreeWidgetItem(["First"]);
		const second = new CTreeWidgetItem(["Second"]);

		root.addChild(first);
		root.addChild(second);
		tree.addTopLevelItem(root);

		const model = tree.model();

		expect(model).not.toBeNull();

		const rootIndex = tree.indexFromItem(root);

		expect(model?.rowCount()).toBe(1);
		expect(model?.rowCount(rootIndex)).toBe(2);

		expect(model?.index(0, 0, rootIndex).data()).toBe(first);
		expect(model?.index(1, 0, rootIndex).data()).toBe(second);
	});

	test("model parentIndex returns parent item", () => {
		const tree = new CTreeWidget();
		const root = new CTreeWidgetItem(["Root"]);
		const child = new CTreeWidgetItem(["Child"]);

		root.addChild(child);
		tree.addTopLevelItem(root);

		const childIndex = tree.indexFromItem(child);
		const parentIndex = tree.model()?.parentIndex(childIndex);

		expect(parentIndex?.isValid()).toBe(true);
		expect(parentIndex?.data()).toBe(root);
	});

	test("model parentIndex of top level item is invalid", () => {
		const tree = new CTreeWidget();
		const root = new CTreeWidgetItem(["Root"]);

		tree.addTopLevelItem(root);

		const parent =
			tree.model()?.parentIndex(tree.indexFromItem(root));

		expect(parent?.isValid()).toBe(false);
	});
});