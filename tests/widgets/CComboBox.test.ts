import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CListWidget } from "../../src/index.js";

describe("CComboBox", () => {
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

	test("is not editable by default", () => {
		const combo = new CComboBox();

		expect(combo.isEditable()).toBe(false);
	});

	test("has no items by default", () => {
		const combo = new CComboBox();

		expect(combo.count()).toBe(0);
	});

	test("has no current item by default", () => {
		const combo = new CComboBox();

		expect(combo.currentIndex()).toBe(-1);
		expect(combo.currentText()).toBe("");
	});

	test("adds item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		expect(combo.count()).toBe(1);
		expect(combo.itemText(0)).toBe("Slovenia");
	});

	test("first added item becomes current", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		expect(combo.currentIndex()).toBe(0);
		expect(combo.currentText()).toBe("Slovenia");
	});

	test("additional item does not become current", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		expect(combo.currentIndex()).toBe(0);
		expect(combo.currentText()).toBe("Slovenia");
	});

	test("inserts item at requested index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Germany");
		combo.insertItem(1, "Austria");

		expect(combo.count()).toBe(3);
		expect(combo.itemText(0)).toBe("Slovenia");
		expect(combo.itemText(1)).toBe("Austria");
		expect(combo.itemText(2)).toBe("Germany");
	});

	test("insertItem clamps negative index to beginning", () => {
		const combo = new CComboBox();

		combo.addItem("Austria");
		combo.insertItem(-10, "Slovenia");

		expect(combo.itemText(0)).toBe("Slovenia");
		expect(combo.itemText(1)).toBe("Austria");
	});

	test("insertItem clamps large index to end", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.insertItem(100, "Austria");

		expect(combo.itemText(0)).toBe("Slovenia");
		expect(combo.itemText(1)).toBe("Austria");
	});

	test("returns empty text for invalid item index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		expect(combo.itemText(-1)).toBe("");
		expect(combo.itemText(1)).toBe("");
	});

	test("sets item text", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.setItemText(0, "Serbia");

		expect(combo.itemText(0)).toBe("Serbia");
	});

	test("setItemText updates current text", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.setItemText(0, "Serbia");

		expect(combo.currentText()).toBe("Serbia");
	});

	test("setItemText ignores invalid index", () => {
		const combo = new CComboBox();

		expect(() => combo.setItemText(0, "Serbia")).not.toThrow();
	});

	test("findText returns item index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.addItem("Germany");

		expect(combo.findText("Austria")).toBe(1);
	});

	test("findText returns -1 for unknown text", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		expect(combo.findText("Serbia")).toBe(-1);
	});

	test("sets current index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		combo.setCurrentIndex(1);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Austria");
	});

	test("setCurrentIndex allows no current item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.setCurrentIndex(-1);

		expect(combo.currentIndex()).toBe(-1);
		expect(combo.currentText()).toBe("");
	});

	test("setCurrentIndex ignores invalid index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		combo.setCurrentIndex(5);

		expect(combo.currentIndex()).toBe(0);
		expect(combo.currentText()).toBe("Slovenia");
	});

	test("sets current text in non editable mode", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		combo.setCurrentText("Austria");

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Austria");
	});

	test("unknown current text is ignored in non editable mode", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		combo.setCurrentText("Serbia");

		expect(combo.currentIndex()).toBe(0);
		expect(combo.currentText()).toBe("Slovenia");
	});

	test("enables editable mode", () => {
		const combo = new CComboBox();

		combo.setEditable(true);

		expect(combo.isEditable()).toBe(true);
	});

	test("editable combo accepts arbitrary current text", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.setEditable(true);

		combo.setCurrentText("Serbia");

		expect(combo.currentText()).toBe("Serbia");
		expect(combo.currentIndex()).toBe(-1);
	});

	test("editable text matching item sets current index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.setEditable(true);

		combo.setCurrentText("Austria");

		expect(combo.currentText()).toBe("Austria");
		expect(combo.currentIndex()).toBe(1);
	});

	test("switching editable combo to non editable restores item text", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.setEditable(true);
		combo.setCurrentText("Serbia");

		combo.setEditable(false);

		expect(combo.isEditable()).toBe(false);
		expect(combo.currentText()).toBe("");
		expect(combo.currentIndex()).toBe(-1);
	});

	test("lineEdit is always available", () => {
		const combo = new CComboBox();

		expect(combo.lineEdit()).not.toBeNull();
		expect(combo.lineEdit().parent()).toBe(combo);
	});

	test("removes item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		combo.removeItem(0);

		expect(combo.count()).toBe(1);
		expect(combo.itemText(0)).toBe("Austria");
	});

	test("removing current item selects nearest item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.addItem("Germany");
		combo.setCurrentIndex(1);

		combo.removeItem(1);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Germany");
	});

	test("removing item before current shifts current index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.addItem("Germany");
		combo.setCurrentIndex(2);

		combo.removeItem(0);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Germany");
	});

	test("removing only item clears current item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.removeItem(0);

		expect(combo.count()).toBe(0);
		expect(combo.currentIndex()).toBe(-1);
		expect(combo.currentText()).toBe("");
	});

	test("removeItem ignores invalid index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		expect(() => combo.removeItem(-1)).not.toThrow();
		expect(() => combo.removeItem(5)).not.toThrow();

		expect(combo.count()).toBe(1);
	});

	test("clears all items", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		combo.clear();

		expect(combo.count()).toBe(0);
		expect(combo.currentIndex()).toBe(-1);
		expect(combo.currentText()).toBe("");
	});

	test("currentIndexChanged is emitted when current index changes", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		const slot = vi.fn();
		combo.currentIndexChanged.connect(slot);

		combo.setCurrentIndex(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("currentIndexChanged is not emitted for same index", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		const slot = vi.fn();
		combo.currentIndexChanged.connect(slot);

		combo.setCurrentIndex(0);

		expect(slot).not.toHaveBeenCalled();
	});

	test("currentTextChanged is emitted when current text changes", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		const slot = vi.fn();
		combo.currentTextChanged.connect(slot);

		combo.setCurrentIndex(1);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("Austria");
	});

	test("editable text emits currentTextChanged", () => {
		const combo = new CComboBox();

		combo.setEditable(true);

		const slot = vi.fn();
		combo.currentTextChanged.connect(slot);

		combo.setCurrentText("Serbia");

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith("Serbia");
	});

	test("showPopup does nothing without items", () => {
		const combo = new CComboBox();

		combo.showPopup();

		expect(combo.popup().isOpen()).toBe(false);
	});

	test("showPopup opens popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.showPopup();

		expect(combo.popup().isOpen()).toBe(true);
		expect(combo.popup().isVisible()).toBe(true);
	});

	test("hidePopup closes popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.showPopup();
		combo.hidePopup();

		expect(combo.popup().isOpen()).toBe(false);
		expect(combo.popup().isVisible()).toBe(false);
	});

	test("showPopup selects current row in list", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.setCurrentIndex(1);

		combo.showPopup();

		expect(combo.listWidget().currentRow()).toBe(1);
	});

	test("clicking popup item activates item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.showPopup();

		const slot = vi.fn();
		combo.activated.connect(slot);

		const item = combo.listWidget().item(1);

		expect(item).not.toBeNull();

		combo.listWidget().itemClicked.emit(item!);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Austria");
		expect(combo.popup().isOpen()).toBe(false);

		expect(slot).toHaveBeenCalledOnce();
		expect(slot).toHaveBeenCalledWith(1);
	});

	test("mouse press marks combo as down", () => {
		const combo = new CComboBox();

		combo.event(new CMouseEvent(
			CEventType.MousePress,
			combo.width() - 5,
			combo.height() / 2,
			CMouseButton.LeftButton
		));

		expect(combo.isDown()).toBe(true);
	});

	test("mouse release opens popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		combo.event(new CMouseEvent(
			CEventType.MousePress,
			combo.width() - 5,
			combo.height() / 2,
			CMouseButton.LeftButton
		));

		combo.event(new CMouseEvent(
			CEventType.MouseRelease,
			combo.width() - 5,
			combo.height() / 2,
			CMouseButton.LeftButton
		));

		expect(combo.isDown()).toBe(false);
		expect(combo.popup().isOpen()).toBe(true);
	});

	test("second mouse click closes popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.showPopup();

		combo.event(new CMouseEvent(
			CEventType.MousePress,
			combo.width() - 5,
			combo.height() / 2,
			CMouseButton.LeftButton
		));

		combo.event(new CMouseEvent(
			CEventType.MouseRelease,
			combo.width() - 5,
			combo.height() / 2,
			CMouseButton.LeftButton
		));

		expect(combo.popup().isOpen()).toBe(false);
	});

	test("ArrowDown selects next item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowDown");
		combo.event(event);

		expect(combo.currentIndex()).toBe(1);
		expect(event.isAccepted()).toBe(true);
	});

	test("ArrowUp selects previous item", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.setCurrentIndex(1);

		const event = new CKeyEvent(CEventType.KeyPress, "ArrowUp");
		combo.event(event);

		expect(combo.currentIndex()).toBe(0);
		expect(event.isAccepted()).toBe(true);
	});

	test("Enter opens popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");

		const event = new CKeyEvent(CEventType.KeyPress, "Enter");
		combo.event(event);

		expect(combo.popup().isOpen()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("Escape closes popup", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.showPopup();

		const event = new CKeyEvent(CEventType.KeyPress, "Escape");
		combo.event(event);

		expect(combo.popup().isOpen()).toBe(false);
		expect(event.isAccepted()).toBe(true);
	});

	test("line edit uses area left of arrow button", () => {
		const combo = new CComboBox();

		combo.resize(200, 30);

		expect(combo.lineEdit().x()).toBe(0);
		expect(combo.lineEdit().y()).toBe(0);
		expect(combo.lineEdit().width()).toBe(
			200 - combo.style().comboBoxArrowWidth()
		);
		expect(combo.lineEdit().height()).toBe(30);
	});

	test("resizing combo updates line edit geometry", () => {
		const combo = new CComboBox();

		combo.resize(300, 40);

		expect(combo.lineEdit().width()).toBe(
			300 - combo.style().comboBoxArrowWidth()
		);
		expect(combo.lineEdit().height()).toBe(40);
	});

	test("popup width follows its longest item", () => {
		const combo = new CComboBox();

		combo.resize(240, 30);
		combo.addItems(["Italy", "Slovenia", "UK"]);
		combo.showPopup();

		const expectedWidth = Math.ceil(
			combo.fontMetrics().textWidth("Slovenia")
		) + 2 * CListWidget.HorizontalPadding
			+ 2 * combo.listWidget().frameWidth()
			+ 2 * combo.popup().frameWidth();

		expect(combo.popup().width()).toBe(expectedWidth);
		expect(combo.popup().width()).toBeLessThan(combo.width());
		expect(combo.listWidget().width()).toBe(
			expectedWidth - 2 * combo.popup().frameWidth()
		);
	});

	test("popup width reserves room for a vertical scrollbar", () => {
		const combo = new CComboBox();

		for (let i = 0; i <= CComboBox.MaxVisibleItems; ++i)
			combo.addItem(i === 0 ? "Longest item" : `Item ${i}`);
		combo.showPopup();

		const expectedWidth = Math.ceil(
			combo.fontMetrics().textWidth("Longest item")
		) + 2 * CListWidget.HorizontalPadding
			+ 2 * combo.listWidget().frameWidth()
			+ 2 * combo.popup().frameWidth()
			+ CListWidget.ScrollBarExtent;

		expect(combo.popup().width()).toBe(expectedWidth);
		expect(combo.listWidget().verticalScrollBar().isVisible()).toBe(true);
	});

	test("popup items expand to the popup viewport width", () => {
		const combo = new CComboBox();

		combo.resize(120, 30);
		for (let i = 0; i < 12; ++i)
			combo.addItem(`Item ${i}`);
		combo.addItem("A considerably wider popup item");
		combo.showPopup();

		expect(combo.listWidget().widget()?.width())
			.toBe(combo.listWidget().viewport().width());
		expect(combo.listWidget().horizontalScrollBar().isVisible()).toBe(false);
	});

	test("popup height follows visible item count", () => {
		const combo = new CComboBox();

		combo.addItem("Slovenia");
		combo.addItem("Austria");
		combo.addItem("Germany");

		combo.showPopup();

		const listFrameWidth = combo.listWidget().frameWidth();
		const popupFrameWidth = combo.popup().frameWidth();

		expect(combo.popup().height()).toBe(
			3 * CListWidget.ItemHeight
			+ 2 * listFrameWidth
			+ 2 * popupFrameWidth
		);
		expect(combo.listWidget().verticalScrollBar().isVisible()).toBe(false);
	});

	test("popup height is limited to maximum visible items", () => {
		const combo = new CComboBox();

		for (let i = 0; i < 20; ++i)
			combo.addItem(`Item ${i}`);

		combo.showPopup();

		const listFrameWidth = combo.listWidget().frameWidth();
		const popupFrameWidth = combo.popup().frameWidth();

		expect(combo.popup().height()).toBe(
			CComboBox.MaxVisibleItems * CListWidget.ItemHeight
			+ 2 * listFrameWidth
			+ 2 * popupFrameWidth
		);
		expect(combo.listWidget().verticalScrollBar().isVisible()).toBe(true);
	});

	test("sizeHint returns default combo size", () => {
		const combo = new CComboBox();

		expect(combo.sizeHint().width()).toBe(120);
		expect(combo.sizeHint().height()).toBe(30);
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const combo = new CComboBox(parent);

		expect(combo.parent()).toBe(parent);
	});

    	test("hovering arrow area sets arrow hover state", () => {
		const combo = new CComboBox();
		combo.resize(200, 30);

		combo.event(new CMouseEvent(
			CEventType.MouseMove,
			190,
			15,
			CMouseButton.NoButton
		));

		expect(combo.isArrowHovered()).toBe(true);
	});

	test("moving outside arrow area clears arrow hover state", () => {
		const combo = new CComboBox();
		combo.resize(200, 30);

		combo.event(new CMouseEvent(
			CEventType.MouseMove,
			190,
			15,
			CMouseButton.NoButton
		));

		expect(combo.isArrowHovered()).toBe(true);

		combo.event(new CMouseEvent(
			CEventType.MouseMove,
			50,
			15,
			CMouseButton.NoButton
		));

		expect(combo.isArrowHovered()).toBe(false);
	});

	test("mouse leave clears arrow hover state", () => {
		const combo = new CComboBox();
		combo.resize(200, 30);

		combo.event(new CMouseEvent(
			CEventType.MouseMove,
			190,
			15,
			CMouseButton.NoButton
		));

		expect(combo.isArrowHovered()).toBe(true);

		combo.event(new CMouseEvent(
			CEventType.MouseLeave,
			190,
			15,
			CMouseButton.NoButton
		));

		expect(combo.isArrowHovered()).toBe(false);
	});

	test("editable combo handles ArrowDown", () => {
		const combo = new CComboBox();

		combo.addItems([
			"Slovenia",
			"Austria",
			"Germany"
		]);
		combo.setEditable(true);
		combo.setCurrentIndex(0);

		combo.lineEdit().event(
			new CKeyEvent(CEventType.KeyPress, "ArrowDown")
		);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Austria");
	});

	test("editable combo handles ArrowUp", () => {
		const combo = new CComboBox();

		combo.addItems([
			"Slovenia",
			"Austria",
			"Germany"
		]);
		combo.setEditable(true);
		combo.setCurrentIndex(2);

		combo.lineEdit().event(
			new CKeyEvent(CEventType.KeyPress, "ArrowUp")
		);

		expect(combo.currentIndex()).toBe(1);
		expect(combo.currentText()).toBe("Austria");
	});

	test("Escape closes popup from editable line edit", () => {
		const combo = new CComboBox();

		combo.addItems([
			"Slovenia",
			"Austria",
			"Germany"
		]);
		combo.setEditable(true);
		combo.showPopup();

		expect(combo.popup().isOpen()).toBe(true);

		combo.lineEdit().event(
			new CKeyEvent(CEventType.KeyPress, "Escape")
		);

		expect(combo.popup().isOpen()).toBe(false);
	});

	test("Enter activates current popup item in editable combo", () => {
		const combo = new CComboBox();

		combo.addItems([
			"Slovenia",
			"Austria",
			"Germany"
		]);
		combo.setEditable(true);
		combo.showPopup();

		combo.listWidget().setCurrentRow(2);

		combo.lineEdit().event(
			new CKeyEvent(CEventType.KeyPress, "Enter")
		);

		expect(combo.currentIndex()).toBe(2);
		expect(combo.currentText()).toBe("Germany");
		expect(combo.popup().isOpen()).toBe(false);
	});

	test("releasing outside arrow does not open popup", () => {
		const combo = new CComboBox();
		combo.resize(200, 30);

		combo.event(new CMouseEvent(CEventType.MousePress, 190, 15, CMouseButton.LeftButton));
		combo.event(new CMouseEvent(CEventType.MouseRelease, 50, 15, CMouseButton.LeftButton));
		expect(combo.popup().isOpen()).toBe(false);
	});
});
