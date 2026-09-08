import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CStyleOptionLineEdit } from "../../src/gui/CStyleOptionLineEdit.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionLineEdit", () => {
    beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionLineEdit();

		expect(option.text).toBe("");
		expect(option.cursorPosition).toBe(0);
		expect(option.cursorVisible).toBe(false);
		expect(option.selectionStart).toBe(0);
		expect(option.selectionEnd).toBe(0);
	});

	test("copy constructor copies values", () => {
		const option = new CStyleOptionLineEdit();
		option.text = "Hello";
		option.cursorPosition = 3;
		option.cursorVisible = true;
		option.selectionStart = 1;
		option.selectionEnd = 4;

		const copy = new CStyleOptionLineEdit(option);

		expect(copy.text).toBe("Hello");
		expect(copy.cursorPosition).toBe(3);
		expect(copy.cursorVisible).toBe(true);
		expect(copy.selectionStart).toBe(1);
		expect(copy.selectionEnd).toBe(4);
	});

	test("initFromLineEdit initializes base option", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setGeometry(10, 20, 160, 28);

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(160);
		expect(option.rect.height()).toBe(28);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromLineEdit copies text", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setText("Hello");

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.text).toBe("Hello");
	});

	test("initFromLineEdit copies cursor position", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setText("Hello");
		lineEdit.setCursorPosition(2);

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.cursorPosition).toBe(2);
	});

	test("initFromLineEdit copies selection", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setText("Hello");
		lineEdit.setSelection(1, 4);

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.selectionStart).toBe(1);
		expect(option.selectionEnd).toBe(4);
	});

	test("initFromLineEdit normalizes reversed selection", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setText("Hello");
		lineEdit.setSelection(4, 1);

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.selectionStart).toBe(1);
		expect(option.selectionEnd).toBe(4);
		expect(option.cursorPosition).toBe(1);
	});

	test("initFromLineEdit copies disabled state", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setEnabled(false);

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromLineEdit copies focus state", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setFocus();

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("initFromLineEdit copies cursor visibility", () => {
		const lineEdit = new CLineEdit();
		lineEdit.setFocus();

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(lineEdit);

		expect(option.cursorVisible).toBe(true);
	});

	test("reinitializing clears previous values", () => {
		const first = new CLineEdit();
		first.setText("Hello");
		first.setSelection(1, 4);
		first.setFocus();

		const option = new CStyleOptionLineEdit();
		option.initFromLineEdit(first);

		const second = new CLineEdit();
		second.setText("X");
		second.setCursorPosition(0);

		option.initFromLineEdit(second);

		expect(option.text).toBe("X");
		expect(option.cursorPosition).toBe(0);
		expect(option.selectionStart).toBe(0);
		expect(option.selectionEnd).toBe(0);
		expect(option.state & CStyleState.HasFocus).toBe(0);
	});
});