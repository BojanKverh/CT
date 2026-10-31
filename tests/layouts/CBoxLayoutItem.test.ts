import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { CSpacerItem } from "../../src/layouts/CSpacerItem.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CBoxLayoutItem } from "../../src/layouts/CBoxLayoutItem.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CBoxLayoutItem", () => {
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

	test("stores widget", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		expect(item.widget()).toBe(widget);
	});

	test("uses zero stretch by default", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		expect(item.stretch()).toBe(0);
	});

	test("stores stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, 3);

		expect(item.stretch()).toBe(3);
	});

	test("clamps negative stretch to zero", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, -2);

		expect(item.stretch()).toBe(0);
	});

	test("sets stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget);

		item.setStretch(4);

		expect(item.stretch()).toBe(4);
	});

	test("clamps negative stretch when setting stretch", () => {
		const widget = new CWidget();
		const item = new CBoxLayoutItem(widget, 3);

		item.setStretch(-1);

		expect(item.stretch()).toBe(0);
	});
});

describe("CSpacerItem", () => {
    test("does not require an application or create a widget", () => {
        const spacer = new CSpacerItem(20, 10);
        expect(spacer.widget()).toBeNull();
        expect(spacer.sizeHint().width()).toBe(20);
        expect(spacer.sizeHint().height()).toBe(10);
    });
    test("default Minimum policy grows but does not shrink", () => {
        const spacer = new CSpacerItem(20, 10);
        expect(spacer.minimumSize().width()).toBe(20);
        expect(spacer.maximumSize().width()).toBe(Number.MAX_SAFE_INTEGER);
        expect(spacer.sizePolicy().verticalPolicy()).toBe(CSizePolicyType.Minimum);
    });
    test("Fixed policy caps both axes at the hint", () => {
        const spacer = new CSpacerItem(20,10,CSizePolicyType.Fixed,CSizePolicyType.Fixed);
        expect(spacer.minimumSize().height()).toBe(10);
        expect(spacer.maximumSize().width()).toBe(20);
    });
    test("Expanding policy can shrink below the hint", () => {
        const spacer = new CSpacerItem(20,10,CSizePolicyType.Expanding,CSizePolicyType.Maximum);
        expect(spacer.minimumSize().width()).toBe(0);
        expect(spacer.minimumSize().height()).toBe(0);
        expect(spacer.maximumSize().height()).toBe(10);
    });
    test("size and policy getters return independent values", () => {
        const spacer = new CSpacerItem(20,10);
        const policy = spacer.sizePolicy(); policy.setHorizontalPolicy(CSizePolicyType.Fixed);
        expect(spacer.sizePolicy().horizontalPolicy()).toBe(CSizePolicyType.Minimum);
        expect(spacer.sizeHint()).not.toBe(spacer.sizeHint());
    });
    test("changeSize replaces the hint and policies", () => {
        const spacer = new CSpacerItem(20,10);
        spacer.changeSize(40,30,CSizePolicyType.Fixed,CSizePolicyType.Expanding);
        expect(spacer.sizeHint().width()).toBe(40);
        expect(spacer.maximumSize().width()).toBe(40);
        expect(spacer.minimumSize().height()).toBe(0);
    });
    test("negative and nonfinite preferred sizes become zero", () => {
        const spacer = new CSpacerItem(-20,NaN);
        expect(spacer.sizeHint().width()).toBe(0);
        expect(spacer.sizeHint().height()).toBe(0);
        spacer.changeSize(Infinity,-Infinity);
        expect(spacer.sizeHint().width()).toBe(0);
        expect(spacer.sizeHint().height()).toBe(0);
    });
    test("stores assigned geometry as an independent rectangle", () => {
        const spacer = new CSpacerItem(20,10); spacer.setGeometry(3,4,50,60);
        expect(spacer.geometry().x()).toBe(3); expect(spacer.geometry().height()).toBe(60);
        expect(spacer.geometry()).not.toBe(spacer.geometry());
        expect(spacer.sizeHint().width()).toBe(20);
    });
});
