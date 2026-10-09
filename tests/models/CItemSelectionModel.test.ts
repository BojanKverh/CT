import { describe, expect, test } from "vitest";
import { CAbstractListModel } from "../../src/models/CAbstractListModel.js";
import { CItemSelectionModel } from "../../src/models/CItemSelectionModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";

class TestListModel extends CAbstractListModel {
	#m_data = ["A", "B", "C"];

	override rowCount(): number {
		return this.#m_data.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_data[index.row()] ?? null;
	}
}

describe("CItemSelectionModel", () => {
	test("stores model", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);

		expect(selection.model()).toBe(model);
	});

	test("starts with invalid current index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);

		expect(selection.currentIndex().isValid()).toBe(false);
	});

	test("starts with no selection", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);

		expect(selection.hasSelection()).toBe(false);
		expect(selection.selectedIndexes()).toEqual([]);
	});

	test("sets current index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.setCurrentIndex(index);

		expect(selection.currentIndex()).toBe(index);
	});

	test("setCurrentIndex emits currentChanged", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		let current = new CModelIndex();
		let previous = new CModelIndex();

		selection.currentChanged.connect((newIndex, oldIndex) => {
			current = newIndex;
			previous = oldIndex;
		});

		selection.setCurrentIndex(index);

		expect(current).toBe(index);
		expect(previous.isValid()).toBe(false);
	});

	test("setting same current index does not emit", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);
		let count = 0;

		selection.setCurrentIndex(index);

		selection.currentChanged.connect(() => {
			count++;
		});

		selection.setCurrentIndex(index);

		expect(count).toBe(0);
	});

	test("selects index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.select(index);

		expect(selection.hasSelection()).toBe(true);
		expect(selection.isSelected(index)).toBe(true);
		expect(selection.selectedIndexes()).toEqual([index]);
	});

	test("selecting invalid index does nothing", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);

		selection.select(new CModelIndex());

		expect(selection.hasSelection()).toBe(false);
	});

	test("selecting same index twice does not duplicate it", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.select(index);
		selection.select(index);

		expect(selection.selectedIndexes()).toEqual([index]);
	});

	test("select emits selectionChanged", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		let selected: CModelIndex[] = [];
		let deselected: CModelIndex[] = [];

		selection.selectionChanged.connect((added, removed) => {
			selected = added;
			deselected = removed;
		});

		selection.select(index);

		expect(selected).toEqual([index]);
		expect(deselected).toEqual([]);
	});

	test("deselects index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.select(index);
		selection.deselect(index);

		expect(selection.isSelected(index)).toBe(false);
		expect(selection.hasSelection()).toBe(false);
	});

	test("deselect emits selectionChanged", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.select(index);

		let selected: CModelIndex[] = [];
		let deselected: CModelIndex[] = [];

		selection.selectionChanged.connect((added, removed) => {
			selected = added;
			deselected = removed;
		});

		selection.deselect(index);

		expect(selected).toEqual([]);
		expect(deselected).toEqual([index]);
	});

	test("deselecting unselected index does nothing", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);
		let count = 0;

		selection.selectionChanged.connect(() => {
			count++;
		});

		selection.deselect(index);

		expect(count).toBe(0);
	});

	test("supports multiple selected indexes", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const first = model.index(0, 0);
		const second = model.index(2, 0);

		selection.select(first);
		selection.select(second);

		expect(selection.selectedIndexes()).toEqual([first, second]);
	});

	test("selectedIndexes returns a copy", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.select(index);

		const indexes = selection.selectedIndexes();
		indexes.length = 0;

		expect(selection.selectedIndexes()).toEqual([index]);
	});

	test("clearSelection clears all selected indexes", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const first = model.index(0, 0);
		const second = model.index(2, 0);

		selection.select(first);
		selection.select(second);
		selection.clearSelection();

		expect(selection.hasSelection()).toBe(false);
		expect(selection.selectedIndexes()).toEqual([]);
	});

	test("clearSelection emits deselected indexes", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const first = model.index(0, 0);
		const second = model.index(2, 0);

		selection.select(first);
		selection.select(second);

		let deselected: CModelIndex[] = [];

		selection.selectionChanged.connect((_selected, removed) => {
			deselected = removed;
		});

		selection.clearSelection();

		expect(deselected).toEqual([first, second]);
	});

	test("clearSelection keeps current index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.setCurrentIndex(index);
		selection.select(index);
		selection.clearSelection();

		expect(selection.currentIndex()).toBe(index);
	});

	test("clear clears selection and current index", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const index = model.index(1, 0);

		selection.setCurrentIndex(index);
		selection.select(index);
		selection.clear();

		expect(selection.hasSelection()).toBe(false);
		expect(selection.currentIndex().isValid()).toBe(false);
	});

	test("does not select index from another model", () => {
		const model1 = new TestListModel();
		const model2 = new TestListModel();
		const selection = new CItemSelectionModel(model1);
		const index = model2.index(1, 0);

		selection.select(index);

		expect(selection.hasSelection()).toBe(false);
		expect(selection.isSelected(index)).toBe(false);
	});

	test("does not set current index from another model", () => {
		const model1 = new TestListModel();
		const model2 = new TestListModel();
		const selection = new CItemSelectionModel(model1);
		const index = model2.index(1, 0);

		selection.setCurrentIndex(index);

		expect(selection.currentIndex().isValid()).toBe(false);
	});

	test("indexes from different models are not equal", () => {
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		const index1 = model1.index(1, 0);
		const index2 = model2.index(1, 0);

		expect(index1.equals(index2)).toBe(false);
	});

	test("remaps the current index without emitting currentChanged", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const oldIndex = model.index(0, 0);
		const newIndex = model.index(2, 0);
		let changedCount = 0;
		selection.setCurrentIndex(oldIndex);
		selection.currentChanged.connect(() => {
			changedCount++;
		});

		selection.remapIndexes([oldIndex], [newIndex]);

		expect(selection.currentIndex().equals(newIndex)).toBe(true);
		expect(changedCount).toBe(0);
	});

	test("remaps multiple selected indexes without selectionChanged", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const first = model.index(0, 0);
		const second = model.index(1, 0);
		const mappedFirst = model.index(2, 0);
		const mappedSecond = model.index(0, 0);
		let changedCount = 0;
		selection.select(first);
		selection.select(second);
		selection.selectionChanged.connect(() => {
			changedCount++;
		});

		selection.remapIndexes(
			[first, second],
			[mappedFirst, mappedSecond]
		);

		expect(selection.selectedIndexes()).toEqual([
			mappedFirst,
			mappedSecond
		]);
		expect(changedCount).toBe(0);
	});

	test("keeps indexes absent from a layout mapping", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const selected = model.index(1, 0);
		selection.select(selected);

		selection.remapIndexes(
			[model.index(0, 0)],
			[model.index(2, 0)]
		);

		expect(selection.selectedIndexes()).toEqual([selected]);
	});

	test("ignores remapping lists of different lengths", () => {
		const model = new TestListModel();
		const selection = new CItemSelectionModel(model);
		const current = model.index(1, 0);
		selection.setCurrentIndex(current);
		selection.select(current);

		selection.remapIndexes(
			[current],
			[model.index(0, 0), model.index(2, 0)]
		);

		expect(selection.currentIndex()).toBe(current);
		expect(selection.selectedIndexes()).toEqual([current]);
	});
});
