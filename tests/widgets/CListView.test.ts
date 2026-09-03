import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CAbstractListModel } from "../../src/models/CAbstractListModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CListView } from "../../src/widgets/CListView.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestListModel extends CAbstractListModel {
	#m_items: string[];

	constructor(items: string[] = ["One", "Two", "Three"]) {
		super();
		this.#m_items = items;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_items.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_items[index.row()] ?? null;
	}

	setItem(row: number, text: string): void {
		if (row < 0 || row >= this.#m_items.length)
			return;

		this.#m_items[row] = text;

		const index = this.index(row, 0);
		this.emitDataChanged(index, index);
	}

	setItems(items: string[]): void {
		this.#m_items = items;
		this.resetModel();
	}
}

describe("CListView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

    afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("constructs without a model", () => {
		const view = new CListView();

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("has expected size hint", () => {
		const view = new CListView();
		const hint = view.sizeHint();

		expect(hint.width()).toBe(200);
		expect(hint.height()).toBe(160);
	});

	test("sets model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.model()).toBe(model);
	});

	test("creates selection model when model is set", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.selectionModel()).not.toBeNull();
		expect(view.selectionModel()?.model()).toBe(model);
	});

	test("setting null model removes selection model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setModel(null);

		expect(view.model()).toBeNull();
		expect(view.selectionModel()).toBeNull();
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("setting same model keeps selection model", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const selectionModel = view.selectionModel();

		view.setModel(model);

		expect(view.selectionModel()).toBe(selectionModel);
	});

	test("changing model creates new selection model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);

		const selectionModel = view.selectionModel();

		view.setModel(model2);

		expect(view.model()).toBe(model2);
		expect(view.selectionModel()).not.toBe(selectionModel);
		expect(view.selectionModel()?.model()).toBe(model2);
	});

	test("current index is initially invalid", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("sets current index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.setCurrentIndex(index);

		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("does not set current index from another model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);

		const index = model2.index(1, 0);

		view.setCurrentIndex(index);

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("can clear current index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);
		view.setCurrentIndex(model.index(1, 0));
		view.setCurrentIndex(new CModelIndex());

		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("selection model can select model index", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.selectionModel()?.select(index);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
	});

	test("model reset clears selection", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.setModel(model);

		const index = model.index(1, 0);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model.setItems(["A", "B"]);

		expect(view.selectionModel()?.hasSelection()).toBe(false);
		expect(view.currentIndex().isValid()).toBe(false);
	});

	test("old model reset does not affect new selection", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);
		view.setModel(model2);

		const index = model2.index(1, 0);

		view.selectionModel()?.select(index);
		view.setCurrentIndex(index);

		model1.setItems(["Changed"]);

		expect(view.selectionModel()?.isSelected(index)).toBe(true);
		expect(view.currentIndex().equals(index)).toBe(true);
	});

	test("old model data change does not affect current model", () => {
		const view = new CListView();
		const model1 = new TestListModel();
		const model2 = new TestListModel();

		view.setModel(model1);
		view.setModel(model2);

		expect(() => {
			model1.setItem(0, "Changed");
		}).not.toThrow();

		expect(view.model()).toBe(model2);
	});

	test("content widget exists", () => {
		const view = new CListView();

		expect(view.widget()).not.toBeNull();
	});

	test("content is at least as high as viewport", () => {
		const view = new CListView();
		const model = new TestListModel();

		view.resize(200, 160);
		view.setModel(model);

		expect(view.widget()!.height())
			.toBeGreaterThanOrEqual(view.viewport().height());
	});

	test("content height grows with item count", () => {
		const view = new CListView();
		const items = Array.from(
			{ length: 20 },
			(_, index) => `Item ${index}`
		);
		const model = new TestListModel(items);

		view.resize(200, 100);
		view.setModel(model);

		expect(view.widget()!.height())
			.toBe(20 * CListView.ItemHeight);
	});

	test("vertical scrollbar appears for long model", () => {
		const view = new CListView();
		const items = Array.from(
			{ length: 20 },
			(_, index) => `Item ${index}`
		);
		const model = new TestListModel(items);

		view.resize(200, 100);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});

	test("vertical scrollbar is hidden for short model", () => {
		const view = new CListView();
		const model = new TestListModel(["One", "Two"]);

		view.resize(200, 160);
		view.setModel(model);

		expect(view.verticalScrollBar().isVisible()).toBe(false);
	});

	test("model reset updates content height", () => {
		const view = new CListView();
		const model = new TestListModel(["One"]);

		view.resize(200, 100);
		view.setModel(model);

		model.setItems(
			Array.from(
				{ length: 10 },
				(_, index) => `Item ${index}`
			)
		);

		expect(view.widget()!.height())
			.toBe(10 * CListView.ItemHeight);
		expect(view.verticalScrollBar().isVisible()).toBe(true);
	});
});