import {
	afterEach, beforeEach, describe, expect, test, vi
} from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import {
	CMouseButton, CMouseEvent
} from "../../src/events/CMouseEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CRect } from "../../src/geometry/CRect.js";
import {
	CAbstractItemModel
} from "../../src/models/CAbstractItemModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import {
	CAbstractItemDelegate
} from "../../src/widgets/CAbstractItemDelegate.js";
import { CItemDelegate } from "../../src/widgets/CItemDelegate.js";
import { CTreeView } from "../../src/widgets/CTreeView.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

type TreeNode = {
	values: string[];
	parent: TreeNode | null;
	children: TreeNode[];
};

function createNode(values: string[], children: TreeNode[] = []): TreeNode {
	const node: TreeNode = {
		values,
		parent: null,
		children
	};

	for (const child of children)
		child.parent = node;

	return node;
}

function createDefaultTree(): TreeNode {
	return createNode(["Root", "", ""], [
		createNode(["Animals", "Group", "2"], [
			createNode(["Cat", "Animal", "4"]),
			createNode(["Dog", "Animal", "4"])
		]),
		createNode(["Plants", "Group", "2"], [
			createNode(["Oak", "Plant", "1"]),
			createNode(["Pine", "Plant", "1"])
		])
	]);
}

class TestTreeModel extends CAbstractItemModel {
	#m_root: TreeNode;

	constructor(root = createDefaultTree()) {
		super();
		this.#m_root = root;
		this.#setParents(this.#m_root, null);
	}

	override rowCount(parent = new CModelIndex()): number {
		const parentNode = this.#nodeForParent(parent);
		return parentNode.children.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return 3;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		const node = index.data() as TreeNode;

		return node.values[index.column()] ?? null;
	}

	override index(row: number, column: number,
		parent = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0 || column >= this.columnCount(parent))
			return new CModelIndex();

		const parentNode = this.#nodeForParent(parent);
		const node = parentNode.children[row];

		if (node === undefined)
			return new CModelIndex();

		return this.createIndex(row, column, node);
	}

	override parentIndex(index: CModelIndex): CModelIndex {
		if (!index.isValid())
			return new CModelIndex();

		const node = index.data() as TreeNode;
		const parent = node.parent;

		if (parent === null || parent === this.#m_root)
			return new CModelIndex();

		const grandParent = parent.parent;

		if (grandParent === null)
			return new CModelIndex();

		const row = grandParent.children.indexOf(parent);

		if (row < 0)
			return new CModelIndex();

		return this.createIndex(row, 0, parent);
	}

	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return ["Name", "Type", "Value"][section] ?? null;

		return section + 1;
	}

	setValue(index: CModelIndex, value: string): void {
		if (!index.isValid())
			return;

		const node = index.data() as TreeNode;
		node.values[index.column()] = value;

		this.emitDataChanged(index, index);
	}

	setTree(root: TreeNode): void {
		this.#m_root = root;
		this.#setParents(this.#m_root, null);
		this.resetModel();
	}

	#nodeForParent(index: CModelIndex): TreeNode {
		if (!index.isValid())
			return this.#m_root;

		return index.data() as TreeNode;
	}

	#setParents(node: TreeNode, parent: TreeNode | null): void {
		node.parent = parent;

		for (const child of node.children)
			this.#setParents(child, node);
	}
}

class EditableTreeModel extends TestTreeModel {
	#m_editable = true;

	setEditable(editable: boolean): void {
		this.#m_editable = editable;
	}

	override isEditable(_index: CModelIndex): boolean {
		return this.#m_editable;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid())
			return false;

		this.setValue(index, String(value));
		return true;
	}
}

class TestItemDelegate extends CAbstractItemDelegate {
	createEditorCalls: Array<{ parent: CWidget; index: CModelIndex }> = [];
	setEditorDataCalls: Array<{ editor: CWidget; index: CModelIndex }> = [];
	setModelDataCalls: Array<{
		editor: CWidget;
		model: CAbstractItemModel;
		index: CModelIndex;
	}> = [];
	updateEditorGeometryCalls: Array<{ editor: CWidget; rect: CRect }> = [];
	lastEditor: CWidget | null = null;
	createEditorResult = true;

	override createEditor(parent: CWidget, index: CModelIndex): CWidget | null {
		this.createEditorCalls.push({ parent, index });

		if (!this.createEditorResult)
			return null;

		this.lastEditor = new CWidget(parent);
		this.lastEditor.setFocusPolicy(CFocusPolicy.StrongFocus);
		return this.lastEditor;
	}

	override setEditorData(editor: CWidget, index: CModelIndex): void {
		this.setEditorDataCalls.push({ editor, index });
	}

	override setModelData(
		editor: CWidget,
		model: CAbstractItemModel,
		index: CModelIndex
	): void {
		this.setModelDataCalls.push({ editor, model, index });
	}

	override updateEditorGeometry(editor: CWidget, rect: CRect): void {
		this.updateEditorGeometryCalls.push({ editor, rect });
		super.updateEditorGeometry(editor, rect);
	}
}

function key(key: string): CKeyEvent {
	return new CKeyEvent(CEventType.KeyPress, key);
}

function mousePress(x: number, y: number): CMouseEvent {
	return new CMouseEvent(CEventType.MousePress, x, y,
		CMouseButton.LeftButton);
}

function mouseDoubleClick(x: number, y: number): CMouseEvent {
	return new CMouseEvent(CEventType.MouseDoubleClick, x, y,
		CMouseButton.LeftButton);
}

describe("CTreeView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("constructs without a model", () => {
		const view = new CTreeView();

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("has expected size hint", () => {
		const view = new CTreeView();
		const hint = view.sizeHint();

		expect(hint.width()).toBe(400);
		expect(hint.height()).toBe(240);
	});

	test("has horizontal header", () => {
		const view = new CTreeView();

		expect(view.header().orientation()).toBe(COrientation.Horizontal);
	});

	test("header initially has no model", () => {
		const view = new CTreeView();

		expect(view.header().model()).toBeNull();
	});

	test("sets model", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		expect(view.model()).toBe(model);
		expect(view.header().model()).toBe(model);
		expect(view.selectionModel()).not.toBeNull();
	});

	test("setting same model preserves selection model", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const selectionModel = view.selectionModel();

		view.setModel(model);

		expect(view.selectionModel()).toBe(selectionModel);
	});

	test("setting null clears model", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setModel(null);

		expect(view.model()).toBeNull();
		expect(view.header().model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
	});

	test("root items are initially collapsed", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const plants = model.index(1, 0);

		expect(view.isExpanded(animals)).toBe(false);
		expect(view.isExpanded(plants)).toBe(false);
	});

	test("expands index", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const expanded = vi.fn();

		view.setModel(model);
		view.expanded.connect(expanded);

		const animals = model.index(0, 0);

		view.expand(animals);

		expect(view.isExpanded(animals)).toBe(true);
		expect(expanded).toHaveBeenCalledOnce();
		expect(expanded).toHaveBeenCalledWith(animals);
	});

	test("collapses index", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const collapsed = vi.fn();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.expand(animals);
		view.collapsed.connect(collapsed);
		view.collapse(animals);

		expect(view.isExpanded(animals)).toBe(false);
		expect(collapsed).toHaveBeenCalledOnce();
		expect(collapsed).toHaveBeenCalledWith(animals);
	});

	test("expanding already expanded index does nothing", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const expanded = vi.fn();

		view.setModel(model);
		view.expanded.connect(expanded);

		const animals = model.index(0, 0);

		view.expand(animals);
		view.expand(animals);

		expect(expanded).toHaveBeenCalledOnce();
	});

	test("collapsing already collapsed index does nothing", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const collapsed = vi.fn();

		view.setModel(model);
		view.collapsed.connect(collapsed);

		const animals = model.index(0, 0);

		view.collapse(animals);

		expect(collapsed).not.toHaveBeenCalled();
	});

	test("leaf cannot be expanded", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const expanded = vi.fn();

		view.setModel(model);

		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.expanded.connect(expanded);
		view.expand(cat);

		expect(view.isExpanded(cat)).toBe(false);
		expect(expanded).not.toHaveBeenCalled();
	});

	test("foreign index cannot be expanded", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const foreignModel = new TestTreeModel();

		view.setModel(model);

		const foreignIndex = foreignModel.index(0, 0);

		view.expand(foreignIndex);

		expect(view.isExpanded(foreignIndex)).toBe(false);
	});

	test("toggleExpanded expands and collapses", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.toggleExpanded(animals);
		expect(view.isExpanded(animals)).toBe(true);

		view.toggleExpanded(animals);
		expect(view.isExpanded(animals)).toBe(false);
	});

	test("setCurrentIndex sets current index", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.setCurrentIndex(animals);

		expect(view.currentIndex().equals(animals)).toBe(true);
	});

	test("setCurrentIndex rejects foreign index", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const foreignModel = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(foreignModel.index(0, 0));

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("click selects root item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.contentMousePressEvent(
			mousePress(40, CTreeView.RowHeight / 2));

		const animals = model.index(0, 0);

		expect(view.currentIndex().equals(animals)).toBe(true);
		expect(view.selectionModel()?.isSelected(animals)).toBe(true);
	});

	test("click selects second root item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.contentMousePressEvent(mousePress(40,
			CTreeView.RowHeight + CTreeView.RowHeight / 2));

		const plants = model.index(1, 0);

		expect(view.currentIndex().equals(plants)).toBe(true);
	});

	test("click selects second column", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
        view.contentMousePressEvent(mousePress(
	        view.header().sectionPosition(1) + 20,
	        CTreeView.RowHeight / 2));

		const index = model.index(0, 1);

		expect(view.currentIndex().equals(index)).toBe(true);
		expect(view.selectionModel()?.isSelected(index)).toBe(true);
	});

	test("clicking another item clears previous selection", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.contentMousePressEvent(
			mousePress(40, CTreeView.RowHeight / 2));
		view.contentMousePressEvent(mousePress(40,
			CTreeView.RowHeight + CTreeView.RowHeight / 2));

		const animals = model.index(0, 0);
		const plants = model.index(1, 0);

		expect(view.selectionModel()?.isSelected(animals)).toBe(false);
		expect(view.selectionModel()?.isSelected(plants)).toBe(true);
	});

	test("clicking expansion indicator expands item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.contentMousePressEvent(
			mousePress(10, CTreeView.RowHeight / 2));

		expect(view.isExpanded(animals)).toBe(true);
	});

	test("clicking expanded indicator collapses item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.expand(animals);
		view.contentMousePressEvent(
			mousePress(10, CTreeView.RowHeight / 2));

		expect(view.isExpanded(animals)).toBe(false);
	});

	test("first navigation key selects first item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const event = key("ArrowDown");

		view.setModel(model);
		view.contentKeyPressEvent(event);

		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("ArrowDown moves to next visible root item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));
		view.contentKeyPressEvent(key("ArrowDown"));

		expect(view.currentIndex().equals(model.index(1, 0))).toBe(true);
	});

	test("ArrowUp moves to previous visible item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.contentKeyPressEvent(key("ArrowUp"));

		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
	});

	test("ArrowDown enters expanded subtree", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.expand(animals);
		view.setCurrentIndex(animals);
		view.contentKeyPressEvent(key("ArrowDown"));

		expect(view.currentIndex().equals(cat)).toBe(true);
	});

	test("ArrowDown traverses expanded subtree", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);
		const dog = model.index(1, 0, animals);

		view.expand(animals);
		view.setCurrentIndex(cat);
		view.contentKeyPressEvent(key("ArrowDown"));

		expect(view.currentIndex().equals(dog)).toBe(true);
	});

	test("ArrowDown exits expanded subtree", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const dog = model.index(1, 0, animals);
		const plants = model.index(1, 0);

		view.expand(animals);
		view.setCurrentIndex(dog);
		view.contentKeyPressEvent(key("ArrowDown"));

		expect(view.currentIndex().equals(plants)).toBe(true);
	});

	test("ArrowRight expands collapsed item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.setCurrentIndex(animals);
		view.contentKeyPressEvent(key("ArrowRight"));

		expect(view.isExpanded(animals)).toBe(true);
		expect(view.currentIndex().equals(animals)).toBe(true);
	});

	test("ArrowRight enters first child when expanded", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.expand(animals);
		view.setCurrentIndex(animals);
		view.contentKeyPressEvent(key("ArrowRight"));

		expect(view.currentIndex().equals(cat)).toBe(true);
	});

	test("ArrowLeft collapses expanded item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.expand(animals);
		view.setCurrentIndex(animals);
		view.contentKeyPressEvent(key("ArrowLeft"));

		expect(view.isExpanded(animals)).toBe(false);
		expect(view.currentIndex().equals(animals)).toBe(true);
	});

	test("ArrowLeft moves child to parent", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.expand(animals);
		view.setCurrentIndex(cat);
		view.contentKeyPressEvent(key("ArrowLeft"));

		expect(view.currentIndex().equals(animals)).toBe(true);
	});

	test("Home moves to first visible item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.contentKeyPressEvent(key("Home"));

		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
	});

	test("End moves to last visible item", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));
		view.contentKeyPressEvent(key("End"));

		expect(view.currentIndex().equals(model.index(1, 0))).toBe(true);
	});

	test("Home preserves current column", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 2));
		view.contentKeyPressEvent(key("Home"));

		expect(view.currentIndex().equals(model.index(0, 2))).toBe(true);
	});

	test("End preserves current column", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 1));
		view.contentKeyPressEvent(key("End"));

		expect(view.currentIndex().equals(model.index(1, 1))).toBe(true);
	});

	test("unknown key is ignored", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const event = key("A");

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));
		view.contentKeyPressEvent(event);

		expect(event.isAccepted()).toBe(false);
		expect(view.currentIndex().equals(model.index(0, 0))).toBe(true);
	});

	test("horizontal scrollbar is hidden for narrow tree", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.resize(500, 240);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(false);
	});

	test("horizontal scrollbar appears for narrow view", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.resize(200, 240);
		view.setModel(model);

		expect(view.horizontalScrollBar().isVisible()).toBe(true);
	});

	test("horizontal scroll updates header offset", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.resize(200, 240);
		view.setModel(model);
		view.setScrollX(80);

		expect(view.scrollX()).toBe(80);
		expect(view.header().offset()).toBe(80);
	});

	test("vertical scrollbar appears for many visible rows", () => {
		const children: TreeNode[] = [];

		for (let i = 0; i < 20; i++)
			children.push(createNode([`Item ${i}`, "Item", `${i}`]));

		const model = new TestTreeModel(
			createNode(["Root", "", ""], children));
		const view = new CTreeView();

		view.resize(400, 120);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("expanding can make vertical scrollbar visible", () => {
		const children: TreeNode[] = [];

		for (let i = 0; i < 20; i++)
			children.push(createNode([`Child ${i}`, "Child", `${i}`]));

		const root = createNode(["Root", "", ""], [
			createNode(["Parent", "Group", "20"], children)
		]);

		const model = new TestTreeModel(root);
		const view = new CTreeView();

		view.resize(400, 120);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(false);

		view.expand(model.index(0, 0));

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("collapsing can hide vertical scrollbar", () => {
		const children: TreeNode[] = [];

		for (let i = 0; i < 20; i++)
			children.push(createNode([`Child ${i}`, "Child", `${i}`]));

		const root = createNode(["Root", "", ""], [
			createNode(["Parent", "Group", "20"], children)
		]);

		const model = new TestTreeModel(root);
		const view = new CTreeView();

		view.resize(400, 120);
		view.setModel(model);

		const parent = model.index(0, 0);

		view.expand(parent);

		expect(view.verticalScrollBar().isVisible()).toBe(true);

		view.collapse(parent);

		expect(view.verticalScrollBar().isVisible()).toBe(false);
	});

	test("model reset clears current index", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(0, 0));

		model.setTree(createDefaultTree());

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("model reset clears selection", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.selectionModel()?.select(animals);
		view.selectionModel()?.setCurrentIndex(animals);

		model.setTree(createDefaultTree());

		expect(view.selectionModel()?.hasSelection()).toBe(false);
	});

	test("model reset clears expanded indexes", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.expand(animals);

		expect(view.isExpanded(animals)).toBe(true);

		model.setTree(createDefaultTree());

		expect(view.isExpanded(animals)).toBe(false);
	});

	test("dataChanged keeps expansion state", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.setModel(model);

		const animals = model.index(0, 0);

		view.expand(animals);
		model.setValue(animals, "Creatures");

		expect(view.isExpanded(animals)).toBe(true);
	});

	test("nested tree can be expanded recursively", () => {
		const grandChild = createNode(["Grandchild", "Leaf", "1"]);
		const child = createNode(["Child", "Group", "1"], [grandChild]);
		const parent = createNode(["Parent", "Group", "1"], [child]);

		const model = new TestTreeModel(
			createNode(["Root", "", ""], [parent]));
		const view = new CTreeView();

		view.setModel(model);

		const parentIndex = model.index(0, 0);
		const childIndex = model.index(0, 0, parentIndex);

		view.expand(parentIndex);
		view.expand(childIndex);

		expect(view.isExpanded(parentIndex)).toBe(true);
		expect(view.isExpanded(childIndex)).toBe(true);
	});

	test("ArrowDown traverses nested expanded tree", () => {
		const grandChild = createNode(["Grandchild", "Leaf", "1"]);
		const child = createNode(["Child", "Group", "1"], [grandChild]);
		const parent = createNode(["Parent", "Group", "1"], [child]);

		const model = new TestTreeModel(
			createNode(["Root", "", ""], [parent]));
		const view = new CTreeView();

		view.setModel(model);

		const parentIndex = model.index(0, 0);
		const childIndex = model.index(0, 0, parentIndex);
		const grandChildIndex = model.index(0, 0, childIndex);

		view.expand(parentIndex);
		view.expand(childIndex);
		view.setCurrentIndex(childIndex);

		view.contentKeyPressEvent(key("ArrowDown"));

		expect(view.currentIndex().equals(grandChildIndex)).toBe(true);
	});

	test("visualRect returns the rectangle of a visible root cell", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();

		view.resize(400, 240);
		view.setModel(model);

		const index = model.index(1, 2);
		const rect = view.visualRect(index);

		expect(rect.x()).toBe(view.header().sectionPosition(2));
		expect(rect.y()).toBe(CTreeView.RowHeight);
		expect(rect.width()).toBe(view.header().sectionSize(2));
		expect(rect.height()).toBe(CTreeView.RowHeight);
	});

	test("visualRect accounts for expanded rows", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const animals = model.index(0, 0);
		const plants = model.index(1, 0);

		view.setModel(model);
		view.expand(animals);

		expect(view.visualRect(plants).y()).toBe(3 * CTreeView.RowHeight);
	});

	test("visualRect is empty for a hidden child", () => {
		const view = new CTreeView();
		const model = new TestTreeModel();
		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.setModel(model);

		const rect = view.visualRect(cat);
		expect(rect.width()).toBe(0);
		expect(rect.height()).toBe(0);
	});

	test("has a default item delegate", () => {
		const view = new CTreeView();

		expect(view.itemDelegate()).toBeInstanceOf(CItemDelegate);
	});

	test("sets the default item delegate", () => {
		const view = new CTreeView();
		const delegate = new TestItemDelegate();

		view.setItemDelegate(delegate);

		expect(view.itemDelegate()).toBe(delegate);
	});

	test("row delegate has priority over column delegate", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const rowDelegate = new TestItemDelegate();
		const columnDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegateForRow(1, rowDelegate);
		view.setItemDelegateForColumn(2, columnDelegate);

		expect(view.itemDelegateForIndex(model.index(1, 2)))
			.toBe(rowDelegate);
		expect(view.itemDelegateForIndex(model.index(0, 2)))
			.toBe(columnDelegate);
	});

	test("removing specialized delegates restores the default delegate", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const defaultDelegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(defaultDelegate);
		view.setItemDelegateForRow(1, new TestItemDelegate());
		view.setItemDelegateForColumn(2, new TestItemDelegate());
		view.setItemDelegateForRow(1, null);
		view.setItemDelegateForColumn(2, null);

		expect(view.itemDelegateForIndex(model.index(1, 2)))
			.toBe(defaultDelegate);
	});

	test("cannot edit invalid, foreign, or non-editable indexes", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const otherModel = new EditableTreeModel();

		view.setModel(model);
		expect(view.edit(new CModelIndex())).toBe(false);
		expect(view.edit(otherModel.index(0, 0))).toBe(false);

		model.setEditable(false);
		expect(view.edit(model.index(0, 0))).toBe(false);
	});

	test("edit creates and initializes an editor in the tree content", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 2);

		view.resize(400, 240);
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(index)).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.parent).toBe(view.widget());
		expect(delegate.setEditorDataCalls).toHaveLength(1);
		expect(delegate.updateEditorGeometryCalls).toHaveLength(1);
		expect(delegate.lastEditor?.x())
			.toBe(view.header().sectionPosition(2));
		expect(delegate.lastEditor?.y()).toBe(CTreeView.RowHeight);
		expect(delegate.lastEditor?.height()).toBe(CTreeView.RowHeight);
		expect(delegate.lastEditor?.isVisible()).toBe(true);
		expect(delegate.lastEditor?.hasFocus()).toBe(true);
	});

	test("edit uses a delegate selected for a child row", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const animals = model.index(0, 0);
		const cat = model.index(0, 0, animals);

		view.setModel(model);
		view.expand(animals);
		view.setItemDelegateForRow(0, delegate);
		view.edit(cat);

		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.index.equals(cat)).toBe(true);
	});

	test("edit fails when the delegate creates no editor", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();

		delegate.createEditorResult = false;
		view.setModel(model);
		view.setItemDelegate(delegate);

		expect(view.edit(model.index(0, 0))).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("editing the same index reuses the current editor", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const index = model.index(0, 0);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);
		view.edit(index);

		expect(delegate.createEditorCalls).toHaveLength(1);
	});

	test("editing another index commits and replaces the editor", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const firstEditor = delegate.lastEditor;
		view.edit(model.index(1, 0));

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(delegate.setModelDataCalls[0]?.editor).toBe(firstEditor);
		expect(delegate.createEditorCalls).toHaveLength(2);
		expect(delegate.lastEditor).not.toBe(firstEditor);
	});

	test("delegate commit signal writes editor data", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const index = model.index(1, 0);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);
		delegate.commitData.emit(delegate.lastEditor!);

		expect(delegate.setModelDataCalls).toHaveLength(1);
		expect(delegate.setModelDataCalls[0]?.model).toBe(model);
		expect(delegate.setModelDataCalls[0]?.index.equals(index)).toBe(true);
	});

	test("delegate close signal closes the active editor", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;
		delegate.closeEditor.emit(editor);

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("changing model closes the active editor", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(model.index(0, 0));
		const editor = delegate.lastEditor!;
		view.setModel(new EditableTreeModel());

		expect(editor.parent()).toBeNull();
		expect(editor.isVisible()).toBe(false);
	});

	test("F2 and Enter start editing the current index", () => {
		for (const keyName of ["F2", "Enter"]) {
			const view = new CTreeView();
			const model = new EditableTreeModel();
			const delegate = new TestItemDelegate();
			const index = model.index(1, 1);

			view.setModel(model);
			view.setItemDelegate(delegate);
			view.setCurrentIndex(index);

			const event = key(keyName);
			view.contentKeyPressEvent(event);

			expect(delegate.createEditorCalls).toHaveLength(1);
			expect(delegate.createEditorCalls[0]?.index.equals(index)).toBe(true);
			expect(event.isAccepted()).toBe(true);
			view.destroy();
		}
	});

	test("resizing a header section updates editor geometry", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const index = model.index(0, 0);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.edit(index);
		const callsBeforeResize = delegate.updateEditorGeometryCalls.length;
		view.header().resizeSection(0, 180);

		expect(delegate.updateEditorGeometryCalls.length)
			.toBeGreaterThan(callsBeforeResize);
		expect(delegate.lastEditor?.width()).toBe(180);
	});

	test("double click selects and starts editing the tree cell", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const x = view.header().sectionPosition(1) + 10;
		const y = CTreeView.RowHeight + 5;
		const event = mouseDoubleClick(x, y);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		const index = model.index(1, 1);
		expect(view.currentIndex().equals(index)).toBe(true);
		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(delegate.createEditorCalls).toHaveLength(1);
		expect(delegate.createEditorCalls[0]?.index.equals(index)).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("double click on an expansion indicator does not start editing", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const event = mouseDoubleClick(10, CTreeView.RowHeight / 2);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		expect(delegate.createEditorCalls).toHaveLength(0);
		expect(view.isExpanded(model.index(0, 0))).toBe(false);
		expect(event.isAccepted()).toBe(true);
	});

	test("double click outside the visible tree rows is ignored", () => {
		const view = new CTreeView();
		const model = new EditableTreeModel();
		const delegate = new TestItemDelegate();
		const event = mouseDoubleClick(40, 20 * CTreeView.RowHeight);

		view.setModel(model);
		view.setItemDelegate(delegate);
		view.contentMouseDoubleClickEvent(event);

		expect(view.currentIndex().isValid()).toBe(false);
		expect(delegate.createEditorCalls).toHaveLength(0);
		expect(event.isAccepted()).toBe(false);
	});
});
