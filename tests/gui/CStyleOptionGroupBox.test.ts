import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionGroupBox } from
	"../../src/gui/CStyleOptionGroupBox.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CGroupBox } from "../../src/widgets/CGroupBox.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionGroupBox", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionGroupBox();

		expect(option.title).toBe("");
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const groupBox = new CGroupBox("Settings");
		groupBox.setGeometry(10, 20, 200, 100);

		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(groupBox);

		const copy = new CStyleOptionGroupBox(option);

		expect(copy.title).toBe("Settings");
		expect(copy.rect.width()).toBe(200);
		expect(copy.rect.height()).toBe(100);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromGroupBox initializes base option", () => {
		const groupBox = new CGroupBox("Settings");
		groupBox.setGeometry(10, 20, 200, 100);

		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(groupBox);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(100);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromGroupBox copies title", () => {
		const groupBox = new CGroupBox("Network settings");

		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(groupBox);

		expect(option.title).toBe("Network settings");
	});

	test("initFromGroupBox reflects disabled state", () => {
		const groupBox = new CGroupBox("Settings");
		groupBox.setEnabled(false);

		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(groupBox);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromGroupBox reflects focus state", () => {
		const groupBox = new CGroupBox("Settings");

		groupBox.setFocusPolicy(CFocusPolicy.StrongFocus);
		groupBox.setFocus();

		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(groupBox);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces title", () => {
		const first = new CGroupBox("First");
		const second = new CGroupBox("Second");

		const option = new CStyleOptionGroupBox();

		option.initFromGroupBox(first);
		option.initFromGroupBox(second);

		expect(option.title).toBe("Second");
	});
});