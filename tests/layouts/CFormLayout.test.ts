import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { vi } from "vitest";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
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

	test("inserts rows while preserving flat widget order", () => {
		const layout = new CFormLayout();
		const firstLabel = new CWidget();
		const firstField = new CWidget();
		const insertedLabel = new CWidget();
		const insertedField = new CWidget();
		const spanning = new CWidget();

		layout.addRow(firstLabel, firstField);
		layout.addRow(spanning);
		layout.insertRow(1, insertedLabel, insertedField);

		expect(layout.rowCount()).toBe(3);
		expect(layout.widgetAt(0)).toBe(firstLabel);
		expect(layout.widgetAt(1)).toBe(firstField);
		expect(layout.widgetAt(2)).toBe(insertedLabel);
		expect(layout.widgetAt(3)).toBe(insertedField);
		expect(layout.widgetAt(4)).toBe(spanning);
	});

	test("clamps inserted row positions", () => {
		const layout = new CFormLayout();
		const middle = new CWidget();
		const first = new CWidget();
		const last = new CWidget();

		layout.addRow(middle);
		layout.insertRow(-10, first);
		layout.insertRow(100, last);

		expect(layout.widgetAt(0, CFormLayoutItemRole.SpanningRole)).toBe(first);
		expect(layout.widgetAt(1, CFormLayoutItemRole.SpanningRole)).toBe(middle);
		expect(layout.widgetAt(2, CFormLayoutItemRole.SpanningRole)).toBe(last);
	});

	test("removes a complete row and its layout items", () => {
		const layout = new CFormLayout();
		const firstLabel = new CWidget();
		const firstField = new CWidget();
		const second = new CWidget();
		layout.addRow(firstLabel, firstField);
		layout.addRow(second);

		layout.removeRow(0);

		expect(layout.rowCount()).toBe(1);
		expect(layout.count()).toBe(1);
		expect(layout.widgetAt(0)).toBe(second);
		layout.removeRow(20);
		expect(layout.rowCount()).toBe(1);
	});

	test("returns the label associated with a field", () => {
		const layout = new CFormLayout();
		const label = new CWidget();
		const field = new CWidget();
		const unknown = new CWidget();
		layout.addRow(label, field);

		expect(layout.labelForField(field)).toBe(label);
		expect(layout.labelForField(label)).toBeNull();
		expect(layout.labelForField(unknown)).toBeNull();
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

	test("supports a fixed label column width and automatic reset", () => {
		const parent = new CWidget();
		parent.resize(400, 100);
		const layout = new CFormLayout();
		parent.setLayout(layout);
		const label = new HintWidget(80, 20);
		const field = new HintWidget(100, 20);
		layout.addRow(label, field);

		layout.setLabelColumnWidth(120);
		expect(layout.labelColumnWidth()).toBe(120);
		expect(label.width()).toBe(120);
		expect(field.x()).toBe(margin + 120 + spacing);

		layout.setLabelColumnWidth(null);
		expect(layout.labelColumnWidth()).toBe(80);
		expect(label.width()).toBe(80);
	});

	test("clamps a fixed label column width to zero", () => {
		const layout = new CFormLayout();
		layout.setLabelColumnWidth(-20);
		expect(layout.labelColumnWidth()).toBe(0);
	});

	test("sets alignment on existing and generated labels", () => {
		const layout = new CFormLayout();
		const firstField = new CWidget();
		layout.addRow("First", firstField);
		const firstLabel = layout.labelForField(firstField) as CLabel;

		layout.setLabelAlignment(CAlignment.Left | CAlignment.VCenter);
		const secondField = new CWidget();
		layout.addRow("Second", secondField);
		const secondLabel = layout.labelForField(secondField) as CLabel;

		expect(layout.labelAlignment()).toBe(
			CAlignment.Left | CAlignment.VCenter
		);
		expect(firstLabel.alignment() & CAlignment.Left).toBeTruthy();
		expect(secondLabel.alignment() & CAlignment.Left).toBeTruthy();
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

describe("CFormLayout automatic label buddies", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        new CApplication(createTestCanvas());
    });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function setup() {
        const root = new CWidget(); root.resize(400, 200);
        const layout = new CFormLayout(); root.setLayout(layout);
        const field = new CWidget(); field.setFocusPolicy(CFocusPolicy.StrongFocus);
        return { root, layout, field };
    }
    function press(key: string) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, altKey: true, ctrlKey: false,
            shiftKey: false, metaKey: false, preventDefault } as unknown as KeyboardEvent);
        return preventDefault;
    }
    test("addRow with text assigns the generated label's buddy", () => {
        const { layout, field } = setup(); layout.addRow("&Name", field);
        const label = layout.labelForField(field) as CLabel;
        expect(label.buddy()).toBe(field);
        expect(label.text()).toBe("&Name"); expect(label.displayText()).toBe("Name");
        expect(label.mnemonic()).toBe("N");
    });
    test("insertRow with text assigns the inserted field's buddy", () => {
        const { layout, field } = setup(); const other = new CWidget();
        layout.addRow("&Other", other); layout.insertRow(0, "&Name", field);
        expect((layout.labelForField(field) as CLabel).buddy()).toBe(field);
        expect((layout.labelForField(other) as CLabel).buddy()).toBe(other);
        expect(layout.widgetAt(0, CFormLayoutItemRole.FieldRole)).toBe(field);
    });
    test("generated labels focus their fields on a left click even without a mnemonic", () => {
        const { layout, field } = setup(); layout.addRow("Name", field);
        const label = layout.labelForField(field) as CLabel;
        const event = new CMouseEvent(CEventType.MousePress, 2, 2, CMouseButton.LeftButton);
        label.event(event);
        expect(event.isAccepted()).toBe(true); expect(field.hasFocus()).toBe(true);
    });
    test("Alt focuses the field from a generated label", () => {
        const { root, layout, field } = setup(); layout.addRow("&Name", field);
        const initial = new CWidget(root); initial.setFocusPolicy(CFocusPolicy.StrongFocus); initial.setFocus();
        expect(press("n")).toHaveBeenCalledOnce(); expect(field.hasFocus()).toBe(true);
    });
    test("Alt follows the correct buddy after inserting another row", () => {
        const { layout, field } = setup(); layout.addRow("&Name", field);
        const other = new CWidget(); other.setFocusPolicy(CFocusPolicy.StrongFocus);
        layout.insertRow(0, "&Age", other);
        press("a"); expect(other.hasFocus()).toBe(true);
        press("n"); expect(field.hasFocus()).toBe(true);
    });
    test("buddy links survive attaching a populated layout to its parent", () => {
        const root = new CWidget(); root.resize(400, 200);
        const layout = new CFormLayout(); const field = new CWidget();
        field.setFocusPolicy(CFocusPolicy.StrongFocus); layout.addRow("&Name", field);
        const label = layout.labelForField(field) as CLabel;
        root.setLayout(layout);
        expect(label.parent()).toBe(root); expect(field.parent()).toBe(root);
        expect(label.buddy()).toBe(field); expect(press("n")).toHaveBeenCalledOnce();
        expect(field.hasFocus()).toBe(true);
    });
    test("escaped ampersands are displayed literally without a shortcut", () => {
        const { layout, field } = setup(); layout.addRow("A && B", field);
        const label = layout.labelForField(field) as CLabel;
        expect(label.displayText()).toBe("A & B"); expect(label.mnemonic()).toBe("");
        expect(press("b")).not.toHaveBeenCalled();
    });
    test("explicit labels retain a manually assigned buddy", () => {
        const { root, layout, field } = setup(); const target = new CWidget(root);
        const label = new CLabel(); label.setText("&Other"); label.setBuddy(target);
        layout.addRow(label, field); expect(label.buddy()).toBe(target);
        const second = new CWidget(); const inserted = new CLabel(); inserted.setBuddy(target);
        layout.insertRow(0, inserted, second); expect(inserted.buddy()).toBe(target);
    });
    test("explicit labels without buddies are not modified", () => {
        const { layout, field } = setup(); const label = new CLabel(); label.setText("&Literal");
        layout.addRow(label, field);
        expect(label.buddy()).toBeNull(); expect(label.displayText()).toBe("&Literal");
    });
    test("generated buddy activation works with a composite field", () => {
        const { layout, field } = setup(); field.setFocusPolicy(CFocusPolicy.NoFocus);
        const input = new CWidget(field); input.setFocusPolicy(CFocusPolicy.StrongFocus);
        layout.addRow("&Country", field);
        expect(press("c")).toHaveBeenCalledOnce(); expect(input.hasFocus()).toBe(true);
    });
    test("a generated buddy does not focus a disabled field", () => {
        const { layout, field } = setup(); layout.addRow("&Name", field); field.setEnabled(false);
        expect(press("n")).not.toHaveBeenCalled(); expect(field.hasFocus()).toBe(false);
        field.setEnabled(true); expect(press("n")).toHaveBeenCalledOnce(); expect(field.hasFocus()).toBe(true);
    });
});

describe("CFormLayout size policies", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", { value: createTestWindow(), writable: true, configurable: true });
        new CApplication(createTestCanvas());
    });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function setup() {
        const root = new CWidget(); root.resize(300, 200); const form = new CFormLayout();
        form.setContentsMargins(0, 0, 0, 0); form.setSpacing(0); root.setLayout(form);
        const label = new HintWidget(50, 20), field = new HintWidget(50, 20);
        form.addRow(label, field); return { root, form, label, field };
    }
    test("default fields grow horizontally but retain preferred height", () => {
        const { field } = setup(); expect(field.width()).toBe(250); expect(field.height()).toBe(20);
    });
    test("Fixed field uses the hint instead of filling its column", () => {
        const { field } = setup(); field.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(field.width()).toBe(50); expect(field.height()).toBe(20); expect(field.x()).toBe(50);
    });
    test("Minimum field does not shrink below its hint", () => {
        const { root, field } = setup(); field.setSizePolicy(CSizePolicyType.Minimum, CSizePolicyType.Fixed);
        root.resize(70, 200); expect(field.width()).toBe(50);
    });
    test("Maximum field does not grow but may shrink", () => {
        const { root, field } = setup(); field.setSizePolicy(CSizePolicyType.Maximum, CSizePolicyType.Fixed);
        expect(field.width()).toBe(50); root.resize(70, 200); expect(field.width()).toBe(20);
    });
    test("Ignored does not fall back to previously assigned geometry", () => {
        const { form, field } = setup(); field.setSizePolicy(CSizePolicyType.Ignored, CSizePolicyType.Ignored);
        expect(form.sizeHint().width()).toBe(50); form.update(); expect(form.sizeHint().width()).toBe(50);
    });
    test("vertically Expanding fields take unused row space", () => {
        const { field, label } = setup(); field.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Expanding);
        expect(field.height()).toBe(200); expect(label.height()).toBe(20); expect(label.y()).toBe(90);
    });
    test("spanning Expanding rows receive extra height before ordinary rows", () => {
        const { form, field } = setup(); const spanning = new HintWidget(100, 30);
        spanning.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Expanding); form.addRow(spanning);
        expect(field.height()).toBe(20); expect(spanning.height()).toBe(180); expect(spanning.y()).toBe(20);
        expect(spanning.width()).toBe(300);
    });
    test("capped expanding rows pass remaining space to another expanding row", () => {
        const { form, field } = setup(); field.setMaximumSize(500, 60);
        field.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Expanding);
        const other = new HintWidget(50, 20); other.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Expanding);
        form.addRow(other); expect(field.height()).toBe(60); expect(other.height()).toBe(140);
    });
    test("vertical stretch divides extra height proportionally", () => {
        const { form, field } = setup(); const other = new HintWidget(50, 20); form.addRow(other);
        const a = field.sizePolicy(); a.setVerticalStretch(1); field.setSizePolicy(a);
        const b = other.sizePolicy(); b.setVerticalStretch(3); other.setSizePolicy(b);
        expect(field.height()).toBe(60); expect(other.height()).toBe(140);
    });
    test("Fixed spanning rows respect both policies", () => {
        const { form } = setup(); const spanning = new HintWidget(80, 30);
        spanning.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed); form.addRow(spanning);
        expect(spanning.width()).toBe(80); expect(spanning.height()).toBe(30);
    });
    test("explicit minimum size overrides a Fixed hint", () => {
        const { field } = setup(); field.setMinimumSize(80, 30);
        field.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(field.width()).toBe(80); expect(field.height()).toBe(30);
    });
    test("Fixed labels align inside a wider configured label column", () => {
        const { form, label } = setup(); form.setLabelColumnWidth(100);
        label.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(label.width()).toBe(50); expect(label.x()).toBe(50);
    });
    test("changing policy immediately updates geometry", () => {
        const { field } = setup(); field.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(field.width()).toBe(50); field.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Fixed);
        expect(field.width()).toBe(250);
    });
});
