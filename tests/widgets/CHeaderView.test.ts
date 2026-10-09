import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
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

function mouseEvent(
	type: CEventType,
	x: number,
	y: number,
	button = CMouseButton.LeftButton
): CMouseEvent {
	return new CMouseEvent(type, x, y, button);
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

	test("sort indicator is hidden and unset initially", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		expect(header.isSortIndicatorShown()).toBe(false);
		expect(header.sortIndicatorSection()).toBe(-1);
		expect(header.sortIndicatorOrder())
			.toBe(CSortOrder.AscendingOrder);
	});

	test("sets sort indicator section and order", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		header.setModel(new TestTableModel());

		header.setSortIndicator(2, CSortOrder.DescendingOrder);

		expect(header.sortIndicatorSection()).toBe(2);
		expect(header.sortIndicatorOrder())
			.toBe(CSortOrder.DescendingOrder);
	});

	test("ignores an invalid sort indicator section", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		header.setModel(new TestTableModel());

		header.setSortIndicator(10, CSortOrder.DescendingOrder);

		expect(header.sortIndicatorSection()).toBe(-1);
		expect(header.sortIndicatorOrder())
			.toBe(CSortOrder.AscendingOrder);
	});

	test("sort indicator can be cleared with section minus one", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		header.setModel(new TestTableModel());
		header.setSortIndicator(2, CSortOrder.DescendingOrder);

		header.setSortIndicator(-1, CSortOrder.AscendingOrder);

		expect(header.sortIndicatorSection()).toBe(-1);
		expect(header.sortIndicatorOrder())
			.toBe(CSortOrder.AscendingOrder);
	});

	test("sets sort indicator visibility", () => {
		const header = new CHeaderView(COrientation.Horizontal);

		header.setSortIndicatorShown(true);
		expect(header.isSortIndicatorShown()).toBe(true);

		header.setSortIndicatorShown(false);
		expect(header.isSortIndicatorShown()).toBe(false);
	});

	test("sortIndicatorChanged emits only when indicator changes", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const changes: Array<[number, CSortOrder]> = [];
		header.setModel(new TestTableModel());
		header.sortIndicatorChanged.connect((section, order) => {
			changes.push([section, order]);
		});

		header.setSortIndicator(1, CSortOrder.DescendingOrder);
		header.setSortIndicator(1, CSortOrder.DescendingOrder);
		header.setSortIndicator(1, CSortOrder.AscendingOrder);

		expect(changes).toEqual([
			[1, CSortOrder.DescendingOrder],
			[1, CSortOrder.AscendingOrder]
		]);
	});

	test("clicking a horizontal section emits sectionClicked", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const clicked: number[] = [];
		header.setModel(new TestTableModel());
		header.sectionClicked.connect(section => clicked.push(section));

		header.event(mouseEvent(CEventType.MousePress, 180, 10));
		header.event(mouseEvent(CEventType.MouseRelease, 180, 10));

		expect(clicked).toEqual([1]);
	});

	test("clicking a vertical section emits sectionClicked", () => {
		const header = new CHeaderView(COrientation.Vertical);
		const clicked: number[] = [];
		header.setModel(new TestTableModel());
		header.sectionClicked.connect(section => clicked.push(section));

		header.event(mouseEvent(CEventType.MousePress, 10, 36));
		header.event(mouseEvent(CEventType.MouseRelease, 10, 36));

		expect(clicked).toEqual([1]);
	});

	test("section click accounts for the header offset", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const clicked: number[] = [];
		header.setModel(new TestTableModel());
		header.setOffset(CHeaderView.DefaultSectionWidth);
		header.sectionClicked.connect(section => clicked.push(section));

		header.event(mouseEvent(CEventType.MousePress, 60, 10));
		header.event(mouseEvent(CEventType.MouseRelease, 60, 10));

		expect(clicked).toEqual([1]);
	});

	test("releasing over another section does not emit a click", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const clicked: number[] = [];
		header.setModel(new TestTableModel());
		header.sectionClicked.connect(section => clicked.push(section));

		header.event(mouseEvent(CEventType.MousePress, 60, 10));
		header.event(mouseEvent(CEventType.MouseRelease, 180, 10));

		expect(clicked).toEqual([]);
	});

	test("using a resize handle does not emit sectionClicked", () => {
		const header = new CHeaderView(COrientation.Horizontal);
		const clicked: number[] = [];
		header.setModel(new TestTableModel());
		header.sectionClicked.connect(section => clicked.push(section));

		header.event(mouseEvent(CEventType.MousePress, 120, 10));
		header.event(mouseEvent(CEventType.MouseRelease, 120, 10));

		expect(clicked).toEqual([]);
	});
});
