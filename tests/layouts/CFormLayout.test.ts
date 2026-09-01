import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CAlignment } from "../../src/core/CAlignment.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import {
	CFormLayout,
	CFormLayoutItemRole
} from "../../src/layouts/CFormLayout.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

class HintWidget extends CWidget {
	constructor(
		private readonly hintWidth: number,
		private readonly hintHeight: number
	) {
		super();
	}

	override sizeHint(): CSize {
		return new CSize(this.hintWidth, this.hintHeight);
	}
}

describe("CFormLayout", () => {
	const spacing: number = 6;
	const margin: number = 6;

	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: createTestWindow(),
			writable: true,
			configurable: true
		});

		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has no rows by default", () => {
		const layout = new CFormLayout();

		expect(layout.rowCount()).toBe(0);
		expect(layout.count()).toBe(0);
	});

	test("adds a label and field row", () => {
		const layout = new CFormLayout();
		const label = new CWidget();
		const field = new CWidget();

		layout.addRow(label, field);

		expect(layout.rowCount()).toBe(1);
		expect(layout.count()).toBe(2);
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.LabelRole)
		).toBe(label);
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.FieldRole)
		).toBe(field);
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.SpanningRole)
		).toBeNull();
	});

	test("creates a label from text", () => {
		const layout = new CFormLayout();
		const field = new CWidget();

		layout.addRow("Name", field);

		const label = layout.widgetAt(
			0,
			CFormLayoutItemRole.LabelRole
		);

		expect(label).toBeInstanceOf(CLabel);
		expect((label as CLabel).text()).toBe("Name");
		expect(
			(label as CLabel).alignment() & CAlignment.Right
		).toBeTruthy();
		expect(
			(label as CLabel).alignment() & CAlignment.VCenter
		).toBeTruthy();
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.FieldRole)
		).toBe(field);
	});

	test("adds a spanning row", () => {
		const layout = new CFormLayout();
		const widget = new CWidget();

		layout.addRow(widget);

		expect(layout.rowCount()).toBe(1);
		expect(layout.count()).toBe(1);
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.LabelRole)
		).toBeNull();
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.FieldRole)
		).toBeNull();
		expect(
			layout.widgetAt(0, CFormLayoutItemRole.SpanningRole)
		).toBe(widget);
	});

	test("keeps flat widget order for base widgetAt overload", () => {
		const layout = new CFormLayout();
		const label = new CWidget();
		const field = new CWidget();
		const spanning = new CWidget();

		layout.addRow(label, field);
		layout.addRow(spanning);

		expect(layout.widgetAt(0)).toBe(label);
		expect(layout.widgetAt(1)).toBe(field);
		expect(layout.widgetAt(2)).toBe(spanning);
	});

	test("returns null for invalid row and role", () => {
		const layout = new CFormLayout();

		expect(
			layout.widgetAt(10, CFormLayoutItemRole.LabelRole)
		).toBeNull();
		expect(
			layout.widgetAt(10, CFormLayoutItemRole.FieldRole)
		).toBeNull();
		expect(
			layout.widgetAt(10, CFormLayoutItemRole.SpanningRole)
		).toBeNull();
	});

	test("uses layout spacing for horizontal and vertical spacing", () => {
		const layout = new CFormLayout();

		expect(layout.spacing()).toBe(spacing);
		expect(layout.horizontalSpacing()).toBe(spacing);
		expect(layout.verticalSpacing()).toBe(spacing);

		layout.setSpacing(10);

		expect(layout.horizontalSpacing()).toBe(10);
		expect(layout.verticalSpacing()).toBe(10);
	});

	test("supports independent horizontal and vertical spacing", () => {
		const layout = new CFormLayout();

		layout.setHorizontalSpacing(12);
		layout.setVerticalSpacing(18);

		expect(layout.horizontalSpacing()).toBe(12);
		expect(layout.verticalSpacing()).toBe(18);
		expect(layout.spacing()).toBe(spacing);
	});

	test("clamps form spacing to zero", () => {
		const layout = new CFormLayout();

		layout.setHorizontalSpacing(-10);
		layout.setVerticalSpacing(-20);

		expect(layout.horizontalSpacing()).toBe(0);
		expect(layout.verticalSpacing()).toBe(0);
	});

	test("lays out label and field using preferred sizes", () => {
		const parent = new CWidget();
		parent.resize(400, 200);

		const layout = new CFormLayout();
		parent.setLayout(layout);

		const label = new HintWidget(80, 20);
		const field = new HintWidget(120, 30);

		layout.addRow(label, field);

		expect(label.x()).toBe(margin);
		expect(label.y()).toBe(margin + 5);
		expect(label.width()).toBe(80);
		expect(label.height()).toBe(20);

		expect(field.x()).toBe(margin + 80 + spacing);
		expect(field.y()).toBe(margin);
		expect(field.width()).toBe(
			400 - 2 * margin - 80 - spacing
		);
		expect(field.height()).toBe(30);
	});

	test("uses the widest label for the label column", () => {
		const parent = new CWidget();
		parent.resize(400, 200);

		const layout = new CFormLayout();
		parent.setLayout(layout);

		const label1 = new HintWidget(40, 20);
		const field1 = new HintWidget(100, 20);
		const label2 = new HintWidget(80, 20);
		const field2 = new HintWidget(100, 20);

		layout.addRow(label1, field1);
		layout.addRow(label2, field2);

		expect(label1.width()).toBe(80);
		expect(label2.width()).toBe(80);

		expect(field1.x()).toBe(margin + 80 + spacing);
		expect(field2.x()).toBe(margin + 80 + spacing);
		expect(field1.width()).toBe(field2.width());
	});

	test("centers shorter widgets vertically within a row", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CFormLayout();
		parent.setLayout(layout);

		const label = new HintWidget(60, 20);
		const field = new HintWidget(100, 40);

		layout.addRow(label, field);

		expect(label.y()).toBe(margin + 10);
		expect(field.y()).toBe(margin);
	});

	test("applies vertical spacing between rows", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const layout = new CFormLayout();
		layout.setVerticalSpacing(12);
		parent.setLayout(layout);

		const label1 = new HintWidget(60, 20);
		const field1 = new HintWidget(100, 30);
		const label2 = new HintWidget(60, 20);
		const field2 = new HintWidget(100, 40);

		layout.addRow(label1, field1);
		layout.addRow(label2, field2);

		expect(field1.y()).toBe(margin);
		expect(field2.y()).toBe(margin + 30 + 12);
	});

	test("applies horizontal spacing between label and field", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CFormLayout();
		layout.setHorizontalSpacing(20);
		parent.setLayout(layout);

		const label = new HintWidget(60, 20);
		const field = new HintWidget(100, 20);

		layout.addRow(label, field);

		expect(label.x()).toBe(margin);
		expect(field.x()).toBe(margin + 60 + 20);
		expect(field.width()).toBe(
			300 - 2 * margin - 60 - 20
		);
	});

	test("lays out spanning rows across the content width", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CFormLayout();
		parent.setLayout(layout);

		const spanning = new HintWidget(100, 30);
		layout.addRow(spanning);

		expect(spanning.x()).toBe(margin);
		expect(spanning.y()).toBe(margin);
		expect(spanning.width()).toBe(300 - 2 * margin);
		expect(spanning.height()).toBe(30);
	});

	test("uses configured contents margins", () => {
		const parent = new CWidget();
		parent.resize(400, 100);

		const layout = new CFormLayout();
		layout.setContentsMargins(10, 20, 30, 40);
		parent.setLayout(layout);

		const label = new HintWidget(80, 20);
		const field = new HintWidget(100, 20);

		layout.addRow(label, field);

		expect(label.x()).toBe(10);
		expect(label.y()).toBe(20);
		expect(field.x()).toBe(10 + 80 + spacing);
		expect(field.width()).toBe(
			400 - 10 - 30 - 80 - spacing
		);
	});

	test("updates geometry when parent is resized", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CFormLayout();
		parent.setLayout(layout);

		const label = new HintWidget(60, 20);
		const field = new HintWidget(100, 20);
		layout.addRow(label, field);

		expect(field.width()).toBe(
			300 - 2 * margin - 60 - spacing
		);

		parent.resize(500, 100);

		expect(field.width()).toBe(
			500 - 2 * margin - 60 - spacing
		);
	});

	test("calculates size hint from rows, spacing and margins", () => {
		const layout = new CFormLayout();

		const label = new HintWidget(80, 20);
		const field = new HintWidget(120, 30);
		const spanning = new HintWidget(250, 40);

		layout.addRow(label, field);
		layout.addRow(spanning);

		const hint = layout.sizeHint();

		expect(hint.width()).toBe(250 + 2 * margin);
		expect(hint.height()).toBe(
			30 + spacing + 40 + 2 * margin
		);
	});

	test("size hint respects widget minimum sizes", () => {
		const layout = new CFormLayout();

		const label = new HintWidget(50, 20);
		const field = new HintWidget(100, 20);

		label.setMinimumSize(80, 30);
		field.setMinimumSize(150, 40);
		layout.addRow(label, field);

		const hint = layout.sizeHint();

		expect(hint.width()).toBe(
			80 + spacing + 150 + 2 * margin
		);
		expect(hint.height()).toBe(40 + 2 * margin);
	});

	test("does not add the same spanning widget twice", () => {
		const layout = new CFormLayout();
		const widget = new CWidget();

		layout.addRow(widget);
		layout.addRow(widget);

		expect(layout.rowCount()).toBe(1);
		expect(layout.count()).toBe(1);
	});

	test("rolls back a row when field cannot be added", () => {
		const layout = new CFormLayout();
		const widget = new CWidget();

		layout.addRow(widget, widget);

		expect(layout.rowCount()).toBe(0);
		expect(layout.count()).toBe(0);
	});

	test("clear removes all rows and layout items", () => {
		const layout = new CFormLayout();

		layout.addRow(new CWidget(), new CWidget());
		layout.addRow(new CWidget());

		layout.clear();

		expect(layout.rowCount()).toBe(0);
		expect(layout.count()).toBe(0);
		expect(layout.widgetAt(0)).toBeNull();
	});

	test("does not expand field beyond maximum width", () => {
		const parent = new CWidget();
		const field = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(300, 100);
		parent.setLayout(layout);

		field.setMinimumSize(50, 20);
		field.setMaximumSize(80, 40);

		layout.addRow("Field:", field);
		layout.update();

		expect(field.width()).toBe(80);
		expect(field.height()).toBe(20);
	});

	test("does not expand spanning widget beyond maximum width", () => {
		const parent = new CWidget();
		const widget = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(300, 100);
		parent.setLayout(layout);

		widget.setMinimumSize(50, 20);
		widget.setMaximumSize(100, 40);

		layout.addRow(widget);
		layout.update();

		expect(widget.width()).toBe(100);
		expect(widget.height()).toBe(20);
	});

	test("respects different maximum widths in field column", () => {
		const parent = new CWidget();
		const first = new CWidget(parent);
		const second = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(400, 150);
		parent.setLayout(layout);

		first.setMinimumSize(50, 20);
		first.setMaximumSize(60, 40);

		second.setMinimumSize(50, 20);
		second.setMaximumSize(160, 40);

		layout.addRow("First:", first);
		layout.addRow("Second:", second);
		layout.update();

		expect(first.width()).toBe(60);
		expect(second.width()).toBe(160);
	});

	test("respects maximum width smaller than field column", () => {
		const parent = new CWidget();
		const small = new CWidget(parent);
		const large = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(400, 150);
		parent.setLayout(layout);

		small.setMinimumSize(50, 20);
		small.setMaximumSize(60, 40);

		large.setMinimumSize(160, 20);
		large.setMaximumSize(160, 40);

		layout.addRow("Small:", small);
		layout.addRow("Large:", large);
		layout.update();

		expect(small.width()).toBe(60);
		expect(large.width()).toBe(160);
	});

	test("keeps narrow field below wider field column width", () => {
		const parent = new CWidget();
		const narrow = new CWidget(parent);
		const wide = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(400, 150);
		parent.setLayout(layout);

		narrow.setMinimumSize(60, 30);
		narrow.setMaximumSize(60, 30);

		wide.setMinimumSize(160, 30);
		wide.setMaximumSize(160, 30);

		layout.addRow("Red:", narrow);
		layout.addRow("Hex:", wide);
		layout.update();

		expect(narrow.width()).toBe(60);
		expect(narrow.height()).toBe(30);
		expect(wide.width()).toBe(160);
		expect(wide.height()).toBe(30);
	});
});
