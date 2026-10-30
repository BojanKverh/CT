import { CSizePolicy, CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CBoxLayout,
	CBoxLayoutDirection
} from "../../src/layouts/CBoxLayout.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CSize } from "../../src/geometry/CSize.js"
import { CVBoxLayout } from "../../src/layouts/CVBoxLayout.js";
import { CHBoxLayout } from "../../src/layouts/CHBoxLayout.js";

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

describe("CBoxLayout", () => {
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

	test("stores layout direction", () => {
		const horizontal = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		const vertical = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		expect(horizontal.direction()).toBe(
			CBoxLayoutDirection.LeftToRight
		);
		expect(vertical.direction()).toBe(
			CBoxLayoutDirection.TopToBottom
		);
	});

	test("does nothing without parent widget", () => {
		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		const widget = new CWidget();
		layout.addWidget(widget);

		expect(() => layout.update()).not.toThrow();
	});

	test("does nothing with empty layout", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		expect(() => layout.update()).not.toThrow();
	});

	test("lays out widgets horizontally", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const width = (300 - 2 * margin - 2 * spacing) / 3;

		expect(widget1.geometry().x()).toBe(margin);
		expect(widget1.geometry().y()).toBe(margin);
		expect(widget1.geometry().width()).toBeCloseTo(width);
		expect(widget1.geometry().height()).toBe(100 - 2 * margin);

		expect(widget2.geometry().x()).toBeCloseTo(margin + width + spacing);
		expect(widget2.geometry().y()).toBe(margin);
		expect(widget2.geometry().width()).toBeCloseTo(width);
		expect(widget2.geometry().height()).toBe(100 - 2 * margin);

		expect(widget3.geometry().x()).toBeCloseTo(margin + 2 * (width + spacing));
		expect(widget3.geometry().y()).toBe(margin);
		expect(widget3.geometry().width()).toBeCloseTo(width);
		expect(widget3.geometry().height()).toBe(100 - 2 * margin);
});

	test("lays out widgets vertically", () => {
		const parent = new CWidget();
		parent.resize(100, 300);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const height = (300 - 2 * margin - 2 * spacing) / 3;

		expect(widget1.geometry().x()).toBe(margin);
		expect(widget1.geometry().y()).toBe(margin);
		expect(widget1.geometry().width()).toBe(100 - 2 * margin);
		expect(widget1.geometry().height()).toBeCloseTo(height);

		expect(widget2.geometry().y()).toBeCloseTo(margin + height + spacing);
		expect(widget2.geometry().height()).toBeCloseTo(height);

		expect(widget3.geometry().y()).toBeCloseTo(margin + 2 * (height + spacing));
		expect(widget3.geometry().height()).toBeCloseTo(height);
});

	test("applies spacing horizontally", () => {
		const parent = new CWidget();
		parent.resize(320, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);
		layout.setSpacing(10);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const width = (320 - 2 * margin - 2 * 10) / 3;

		expect(widget1.geometry().x()).toBe(margin);
		expect(widget1.geometry().width()).toBe(width);
		expect(widget2.geometry().x()).toBe(margin + width + 10);
		expect(widget2.geometry().width()).toBe(width);
		expect(widget3.geometry().x()).toBe(margin + 2 * (width + 10));
		expect(widget3.geometry().width()).toBe(width);
});

	test("applies spacing vertically", () => {
		const parent = new CWidget();
		parent.resize(100, 320);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);
		layout.setSpacing(10);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const height = (320 - 2 * margin - 2 * 10) / 3;

		expect(widget1.geometry().y()).toBe(margin);
		expect(widget1.geometry().height()).toBe(height);
		expect(widget2.geometry().y()).toBe(margin + height + 10);
		expect(widget2.geometry().height()).toBe(height);
		expect(widget3.geometry().y()).toBe(margin + 2 * (height + 10));
		expect(widget3.geometry().height()).toBe(height);
});

	test("relayouts widgets when spacing changes", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		layout.setSpacing(20);

		const width = (300 - 2 * margin - 20) / 2;

		expect(widget1.geometry().width()).toBe(width);
		expect(widget2.geometry().x()).toBe(margin + width + 20);
		expect(widget2.geometry().width()).toBe(width);
});

	test("relayouts widgets when parent is resized", () => {
		const parent = new CWidget();
		parent.resize(200, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		let width = (200 - 2 * margin - spacing) / 2;

		expect(widget1.geometry().width()).toBe(width);
		expect(widget2.geometry().x()).toBe(margin + width + spacing);

		parent.resize(400, 100);
		width = (400 - 2 * margin - spacing) / 2;

		expect(widget1.geometry().width()).toBe(width);
		expect(widget2.geometry().x()).toBe(margin + width + spacing);
		expect(widget2.geometry().width()).toBe(width);
});

	test("supports fractional widget sizes", () => {
		const parent = new CWidget();
		parent.resize(100, 40);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);
		layout.addWidget(widget3);

		const width = (100 - 2 * margin - 2 * spacing) / 3;

		expect(widget1.geometry().width()).toBeCloseTo(width);
		expect(widget2.geometry().x()).toBeCloseTo(margin + width + spacing);
		expect(widget3.geometry().x()).toBeCloseTo(margin + 2 * (width + spacing));
});

	test("applies spacing inside contents margins", () => {
		const parent = new CWidget();
		parent.resize(340, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setContentsMargins(10, 10, 10, 10);
		layout.setSpacing(20);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		expect(widget1.x()).toBe(10);
		expect(widget1.width()).toBe(150);

		expect(widget2.x()).toBe(180);
		expect(widget2.width()).toBe(150);

		expect(widget1.y()).toBe(10);
		expect(widget1.height()).toBe(80);

		expect(widget2.y()).toBe(10);
		expect(widget2.height()).toBe(80);
	});

	test("applies horizontal stretch factors", () => {
		const parent = new CWidget();
		parent.resize(400, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		const available = 400 - 2 * margin - 2 * spacing;

		expect(widget1.x()).toBe(margin);
		expect(widget1.width()).toBe(available / 4);
		expect(widget2.x()).toBe(margin + available / 4 + spacing);
		expect(widget2.width()).toBe(available / 2);
		expect(widget3.x()).toBe(margin + 3 * available / 4 + 2 * spacing);
		expect(widget3.width()).toBe(available / 4);
});

	test("applies vertical stretch factors", () => {
		const parent = new CWidget();
		parent.resize(100, 400);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.TopToBottom
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		const available = 400 - 2 * margin - 2 * spacing;

		expect(widget1.y()).toBe(margin);
		expect(widget1.height()).toBe(available / 4);
		expect(widget2.y()).toBe(margin + available / 4 + spacing);
		expect(widget2.height()).toBe(available / 2);
		expect(widget3.y()).toBe(margin + 3 * available / 4 + 2 * spacing);
		expect(widget3.height()).toBe(available / 4);
});

	test("uses equal sizes when stretch is zero", () => {
		const parent = new CWidget();
		parent.resize(300, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 0);
		layout.addWidget(widget2, 0);
		layout.addWidget(widget3, 0);

		const width = (300 - 2 * margin - 2 * spacing) / 3;

		expect(widget1.width()).toBe(width);
		expect(widget2.width()).toBe(width);
		expect(widget3.width()).toBe(width);
});

	test("combines stretch factors with spacing", () => {
		const parent = new CWidget();
		parent.resize(420, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setSpacing(10);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		const available = 420 - 2 * margin - 2 * 10;

		expect(widget1.width()).toBe(available / 4);
		expect(widget1.x()).toBe(margin);
		expect(widget2.width()).toBe(available / 2);
		expect(widget2.x()).toBe(margin + available / 4 + 10);
		expect(widget3.width()).toBe(available / 4);
		expect(widget3.x()).toBe(margin + 3 * available / 4 + 20);
});

	test("combines stretch factors with contents margins", () => {
		const parent = new CWidget();
		parent.resize(440, 100);

		const layout = new CBoxLayout(
			CBoxLayoutDirection.LeftToRight
		);

		layout.setContentsMargins(20, 10, 20, 10);
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();

		layout.addWidget(widget1, 1);
		layout.addWidget(widget2, 2);
		layout.addWidget(widget3, 1);

		const available = 440 - 20 - 20 - 2 * spacing;

		expect(widget1.x()).toBe(20);
		expect(widget1.width()).toBe(available / 4);
		expect(widget2.x()).toBe(20 + available / 4 + spacing);
		expect(widget2.width()).toBe(available / 2);
		expect(widget3.x()).toBe(20 + 3 * available / 4 + 2 * spacing);
		expect(widget3.width()).toBe(available / 4);
		expect(widget1.y()).toBe(10);
		expect(widget1.height()).toBe(80);
});

    test("uses preferred sizes and distributes extra space by stretch", () => {
	    const parent = new CWidget();
	    parent.resize(500, 100);
    	const layout = new CBoxLayout(
	    	CBoxLayoutDirection.LeftToRight
	    );

    	parent.setLayout(layout);
    	const widget1 = new HintWidget(100, 40);
	    const widget2 = new HintWidget(150, 40);
    	layout.addWidget(widget1, 1);
	    layout.addWidget(widget2, 2);
		const available = 500 - 2 * margin - spacing;
		const extra = available - 100 - 150;

		expect(widget1.width()).toBeCloseTo(100 + extra / 3);
		expect(widget2.width()).toBeCloseTo(150 + 2 * extra / 3);
		expect(widget1.x()).toBe(margin);
		expect(widget2.x()).toBeCloseTo(margin + widget1.width() + spacing);
});

    test("shrinks preferred sizes toward minimum sizes", () => {
	    const parent = new CWidget();
	    parent.resize(200, 100);
	    const layout = new CBoxLayout(
		    CBoxLayoutDirection.LeftToRight
	    );
    	parent.setLayout(layout);
    	const widget1 = new HintWidget(100, 40);
	    const widget2 = new HintWidget(150, 40);
    	widget1.setMinimumSize(50, 0);
	    widget2.setMinimumSize(80, 0);
    	layout.addWidget(widget1);
	    layout.addWidget(widget2);
		const available = 200 - 2 * margin - spacing;
		const shrink = (250 - available) / ((100 - 50) + (150 - 80));
		const expected1 = 100 - (100 - 50) * shrink;
		const expected2 = 150 - (150 - 80) * shrink;

		expect(widget1.width()).toBeCloseTo(expected1);
		expect(widget2.width()).toBeCloseTo(expected2);
		expect(widget1.width()).toBeGreaterThanOrEqual(50);
		expect(widget2.width()).toBeGreaterThanOrEqual(80);
	});

	test("does not expand widget beyond maximum width", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const layout = new CHBoxLayout();

		parent.resize(300, 100);
		parent.setLayout(layout);

		child.setMinimumSize(50, 20);
		child.setMaximumSize(100, 50);

		layout.addWidget(child);
		layout.update();

		expect(child.width()).toBe(100);
		expect(child.height()).toBe(50);
	});

	test("gives remaining space to stretch after maximum width", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const layout = new CHBoxLayout();

		parent.resize(300, 100);
		parent.setLayout(layout);

		child.setMinimumSize(50, 20);
		child.setMaximumSize(100, 50);

		layout.addWidget(child);
		layout.addStretch(1);
		layout.update();

		expect(child.width()).toBe(50);
		expect(child.height()).toBe(50);
	});

	test("respects different maximum widths", () => {
		const parent = new CWidget();
		const first = new CWidget(parent);
		const second = new CWidget(parent);
		const layout = new CHBoxLayout();

		parent.resize(500, 100);
		parent.setLayout(layout);

		first.setMinimumSize(50, 20);
		first.setMaximumSize(100, 50);

		second.setMinimumSize(50, 20);
		second.setMaximumSize(150, 50);

		layout.addWidget(first);
		layout.addWidget(second);
		layout.addStretch(1);
		layout.update();

		expect(first.width()).toBe(50);
		expect(second.width()).toBe(50);
	});

	test("does not expand widget beyond maximum height", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const layout = new CVBoxLayout();

		parent.resize(100, 300);
		parent.setLayout(layout);

		child.setMinimumSize(20, 50);
		child.setMaximumSize(50, 100);

		layout.addWidget(child);
		layout.update();

		expect(child.width()).toBe(50);
		expect(child.height()).toBe(100);
	});

	test("respects minimum and maximum size together", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const layout = new CHBoxLayout();

		parent.resize(80, 100);
		parent.setLayout(layout);

		child.setMinimumSize(60, 30);
		child.setMaximumSize(100, 50);

		layout.addWidget(child);
		layout.update();

		expect(child.width()).toBe(68);
		expect(child.height()).toBe(50);
	});

});
describe("CBoxLayout size policies", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", { value: createTestWindow(), writable: true, configurable: true });
        new CApplication(createTestCanvas());
    });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function setup(vertical = false, width = 300, height = 100) {
        const root = new CWidget(); root.resize(width, height);
        const layout = new CBoxLayout(vertical ? CBoxLayoutDirection.TopToBottom : CBoxLayoutDirection.LeftToRight);
        layout.setContentsMargins(0, 0, 0, 0); layout.setSpacing(0); root.setLayout(layout);
        const a = new HintWidget(50, 20), b = new HintWidget(50, 20);
        layout.addWidget(a); layout.addWidget(b); return { root, layout, a, b };
    }
    test("Preferred preserves equal growth and fills the cross axis", () => {
        const { a, b } = setup(); expect(a.width()).toBe(150); expect(b.width()).toBe(150); expect(a.height()).toBe(100);
    });
    test("Fixed preserves the hint on both axes", () => {
        const { a, b } = setup(); a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(a.width()).toBe(50); expect(a.height()).toBe(20); expect(b.width()).toBe(250);
    });
    test("Expanding receives extra space before Preferred", () => {
        const { a, b } = setup(); b.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Preferred);
        expect(a.width()).toBe(50); expect(b.width()).toBe(250);
    });
    test("a capped expanding item passes remaining space to Preferred", () => {
        const { a, b } = setup(); b.setMaximumSize(100, 100);
        b.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Preferred);
        expect(a.width()).toBe(200); expect(b.width()).toBe(100);
    });
    test("Minimum does not shrink below its hint", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Minimum, CSizePolicyType.Preferred);
        root.resize(60, 100); expect(a.width()).toBe(50); expect(b.width()).toBe(10);
    });
    test("Maximum shrinks but does not grow past its hint", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Maximum, CSizePolicyType.Preferred);
        expect(a.width()).toBe(50); expect(b.width()).toBe(250);
        root.resize(60, 100); expect(a.width()).toBe(30); expect(b.width()).toBe(30);
    });
    test("MinimumExpanding takes extra space but will not shrink below its hint", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.MinimumExpanding, CSizePolicyType.Preferred);
        expect(a.width()).toBe(250); expect(b.width()).toBe(50);
        root.resize(60, 100); expect(a.width()).toBe(50); expect(b.width()).toBe(10);
    });
    test("Ignored removes its hint contribution while honoring an explicit minimum", () => {
        const { layout, a } = setup(); a.setMinimumSize(10, 5);
        a.setSizePolicy(CSizePolicyType.Ignored, CSizePolicyType.Ignored);
        expect(layout.sizeHint().width()).toBe(60); expect(layout.sizeHint().height()).toBe(20);
    });
    test("explicit bounds override Fixed hint", () => {
        const { a } = setup(); a.setMinimumSize(80, 30);
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        expect(a.width()).toBe(80); expect(a.height()).toBe(30);
        a.setMaximumSize(90, 40); expect(a.width()).toBe(80);
    });
    test("explicit stretch cannot expand a Fixed item", () => {
        const { layout, a, b } = setup(); layout.clear();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        layout.addWidget(a, 10); layout.addWidget(b, 1);
        expect(a.width()).toBe(50); expect(b.width()).toBe(250);
    });
    test("policy stretch distributes extra space proportionally", () => {
        const { a, b } = setup();
        const pa = new CSizePolicy(); pa.setHorizontalStretch(1);
        const pb = new CSizePolicy(); pb.setHorizontalStretch(3);
        a.setSizePolicy(pa); b.setSizePolicy(pb);
        expect(a.width()).toBe(100); expect(b.width()).toBe(200);
    });
    test("vertical layout uses vertical policy and horizontal cross policy", () => {
        const { a, b } = setup(true, 100, 200);
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Expanding);
        expect(a.width()).toBe(50); expect(a.height()).toBe(180); expect(b.height()).toBe(20);
    });
    test("Fixed items overflow a too-small container instead of violating their size", () => {
        const { root, a, b } = setup();
        a.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        b.setSizePolicy(CSizePolicyType.Fixed, CSizePolicyType.Fixed);
        root.resize(40, 10); expect(a.width()).toBe(50); expect(b.width()).toBe(50); expect(a.height()).toBe(20);
    });
    test("fixed cross axis ignores resizing while the growable neighbor fills it", () => {
        const { root, a, b } = setup(); a.setSizePolicy(CSizePolicyType.Preferred, CSizePolicyType.Fixed);
        root.resize(400, 150); expect(a.height()).toBe(20); expect(b.height()).toBe(150);
    });
    test("default policies preserve mixed explicit and implicit stretch weights", () => {
        const { layout, a, b } = setup(); layout.clear(); layout.addWidget(a, 3); layout.addWidget(b);
        expect(a.width()).toBe(200); expect(b.width()).toBe(100);
    });
});
