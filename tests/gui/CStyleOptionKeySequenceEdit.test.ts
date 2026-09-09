import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionKeySequenceEdit } from
	"../../src/gui/CStyleOptionKeySequenceEdit.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CKeySequenceEdit } from "../../src/widgets/CKeySequenceEdit.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionKeySequenceEdit", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionKeySequenceEdit();

		expect(option.keySequence).toBe("");
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const edit = new CKeySequenceEdit();

		edit.setGeometry(10, 20, 160, 28);
		edit.setKeySequence("Ctrl+Shift+S");

		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(edit);

		const copy = new CStyleOptionKeySequenceEdit(option);

		expect(copy.keySequence).toBe("Ctrl+Shift+S");
		expect(copy.rect.width()).toBe(160);
		expect(copy.rect.height()).toBe(28);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromKeySequenceEdit initializes base option", () => {
		const edit = new CKeySequenceEdit();

		edit.setGeometry(10, 20, 160, 28);

		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(edit);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(160);
		expect(option.rect.height()).toBe(28);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromKeySequenceEdit copies key sequence", () => {
		const edit = new CKeySequenceEdit();

		edit.setKeySequence("Ctrl+Alt+Delete");

		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(edit);

		expect(option.keySequence).toBe("Ctrl+Alt+Delete");
	});

	test("initFromKeySequenceEdit reflects disabled state", () => {
		const edit = new CKeySequenceEdit();

		edit.setEnabled(false);

		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(edit);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromKeySequenceEdit reflects focus state", () => {
		const edit = new CKeySequenceEdit();

		expect(edit.focusPolicy()).toBe(CFocusPolicy.StrongFocus);

		edit.setFocus();

		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(edit);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces key sequence", () => {
		const edit = new CKeySequenceEdit();
		const option = new CStyleOptionKeySequenceEdit();

		edit.setKeySequence("Ctrl+A");
		option.initFromKeySequenceEdit(edit);

		expect(option.keySequence).toBe("Ctrl+A");

		edit.setKeySequence("Shift+F5");
		option.initFromKeySequenceEdit(edit);

		expect(option.keySequence).toBe("Shift+F5");
	});
});