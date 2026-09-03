import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CHeaderView } from "../../src/widgets/CHeaderView.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestTableModel extends CAbstractTableModel {
	#m_rows: number;
	#m_columns: number;

	constructor(rows = 3, columns = 4) {
		super();
		this.#m_rows = rows;
		this.#m_columns = columns;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_rows;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_columns;
	}

	override data(_index: CModelIndex): unknown {
		return null;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		if (orientation === COrientation.Horizontal)
			return ["Name", "Country", "Age", "City"][section] ?? null;

		return section + 1;
	}
}

describe("CHeaderView", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("constructs without a model", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		expect(header.model()).toBeNull();
		expect(header.orientation()).toBe(COrientation.Horizontal);
		expect(header.offset()).toBe(0);
	});

	test("stores horizontal orientation", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		expect(header.orientation()).toBe(COrientation.Horizontal);
	});

	test("stores vertical orientation", () => {
		const header = new CHeaderView(COrientation.Vertical);

		expect(header.orientation()).toBe(COrientation.Vertical);
	});

	test("sets model", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const model = new TestTableModel();

		header.setModel(model);

		expect(header.model()).toBe(model);
	});

	test("can clear model", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const model = new TestTableModel();

		header.setModel(model);
		header.setModel(null);

		expect(header.model()).toBeNull();
	});

	test("setting same model keeps model", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const model = new TestTableModel();

		header.setModel(model);
		header.setModel(model);

		expect(header.model()).toBe(model);
	});

	test("offset is initially zero", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		expect(header.offset()).toBe(0);
	});

	test("sets offset", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		header.setOffset(50);

		expect(header.offset()).toBe(50);
	});

	test("negative offset is clamped to zero", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		header.setOffset(50);
		header.setOffset(-10);

		expect(header.offset()).toBe(0);
	});

	test("horizontal section has expected width", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		expect(header.sectionSize(0))
			.toBe(CHeaderView.DefaultSectionWidth);
		expect(header.sectionSize(5))
			.toBe(CHeaderView.DefaultSectionWidth);
	});

	test("vertical section has expected height", () => {
		const header = new CHeaderView(COrientation.Vertical);

		expect(header.sectionSize(0))
			.toBe(CHeaderView.DefaultSectionHeight);
		expect(header.sectionSize(5))
			.toBe(CHeaderView.DefaultSectionHeight);
	});

	test("length is zero without model", () => {
		const horizontal =
			new CHeaderView(COrientation.Horizontal);
		const vertical =
			new CHeaderView(COrientation.Vertical);

		expect(horizontal.length()).toBe(0);
		expect(vertical.length()).toBe(0);
	});

	test("horizontal length uses column count", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const model = new TestTableModel(3, 4);

		header.setModel(model);

		expect(header.length()).toBe(
			4 * CHeaderView.DefaultSectionWidth
		);
	});

	test("vertical length uses row count", () => {
		const header = new CHeaderView(COrientation.Vertical);
		const model = new TestTableModel(3, 4);

		header.setModel(model);

		expect(header.length()).toBe(
			3 * CHeaderView.DefaultSectionHeight
		);
	});

	test("horizontal size hint uses length and header height", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const model = new TestTableModel(3, 4);

		header.setModel(model);

		const hint = header.sizeHint();

		expect(hint.width()).toBe(
			4 * CHeaderView.DefaultSectionWidth
		);
		expect(hint.height())
			.toBe(CHeaderView.DefaultSectionHeight);
	});

	test("vertical size hint uses header width and length", () => {
		const header = new CHeaderView(COrientation.Vertical);
		const model = new TestTableModel(3, 4);

		header.setModel(model);

		const hint = header.sizeHint();

		expect(hint.width())
			.toBe(CHeaderView.DefaultVerticalWidth);
		expect(hint.height()).toBe(
			3 * CHeaderView.DefaultSectionHeight
		);
	});

	test("horizontal size hint without model has zero length", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const hint = header.sizeHint();

		expect(hint.width()).toBe(0);
		expect(hint.height())
			.toBe(CHeaderView.DefaultSectionHeight);
	});

	test("vertical size hint without model has zero length", () => {
		const header = new CHeaderView(COrientation.Vertical);
		const hint = header.sizeHint();

		expect(hint.width())
			.toBe(CHeaderView.DefaultVerticalWidth);
		expect(hint.height()).toBe(0);
	});
});