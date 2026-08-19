import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CPopupWidget } from "../../src/widgets/CPopupWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

describe("CPopupWidget", () => {
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

	test("is closed and hidden by default", () => {
		const popup = new CPopupWidget();

		expect(popup.isOpen()).toBe(false);
		expect(popup.isVisible()).toBe(false);
	});

	test("opens popup", () => {
		const popup = new CPopupWidget();

		popup.open();

		expect(popup.isOpen()).toBe(true);
		expect(popup.isVisible()).toBe(true);
		expect(CApplication.instance().popupWidgets()).toContain(popup);
	});

	test("closes popup", () => {
		const popup = new CPopupWidget();

		popup.open();
		popup.close();

		expect(popup.isOpen()).toBe(false);
		expect(popup.isVisible()).toBe(false);
		expect(CApplication.instance().popupWidgets()).not.toContain(popup);
	});

	test("opening already open popup does not duplicate it", () => {
		const popup = new CPopupWidget();

		popup.open();
		popup.open();

		expect(CApplication.instance().popupWidgets()).toEqual([popup]);
	});

	test("closing already closed popup does nothing", () => {
		const popup = new CPopupWidget();

		expect(() => popup.close()).not.toThrow();
		expect(CApplication.instance().popupWidgets()).toEqual([]);
	});

	test("multiple popups preserve open order", () => {
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();
		const popup3 = new CPopupWidget();

		popup1.open();
		popup2.open();
		popup3.open();

		expect(CApplication.instance().popupWidgets()).toEqual([
			popup1,
			popup2,
			popup3
		]);
	});

	test("closing popup removes only that popup", () => {
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();
		const popup3 = new CPopupWidget();

		popup1.open();
		popup2.open();
		popup3.open();

		popup2.close();

		expect(CApplication.instance().popupWidgets()).toEqual([
			popup1,
			popup3
		]);
	});

	test("popup can be reopened after closing", () => {
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();

		popup1.open();
		popup2.open();

		popup1.close();
		popup1.open();

		expect(CApplication.instance().popupWidgets()).toEqual([
			popup2,
			popup1
		]);
	});
});