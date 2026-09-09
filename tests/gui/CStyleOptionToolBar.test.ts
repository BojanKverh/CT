import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CToolBar } from "../../src/widgets/CToolBar.js";
import { CStyleOptionToolBar } from
	"../../src/gui/CStyleOptionToolBar.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionToolBar", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default base values", () => {
		const option = new CStyleOptionToolBar();

		expect(option.rect.width()).toBe(0);
		expect(option.rect.height()).toBe(0);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies base values", () => {
		const toolBar = new CToolBar();
		toolBar.setGeometry(10, 20, 300, 36);

		const option = new CStyleOptionToolBar();
		option.initFromToolBar(toolBar);

		const copy = new CStyleOptionToolBar(option);

		expect(copy.rect.width()).toBe(300);
		expect(copy.rect.height()).toBe(36);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromToolBar initializes base option", () => {
		const toolBar = new CToolBar();
		toolBar.setGeometry(10, 20, 300, 36);
		toolBar.setEnabled(false);

		const option = new CStyleOptionToolBar();
		option.initFromToolBar(toolBar);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(300);
		expect(option.rect.height()).toBe(36);
		expect(option.state & CStyleState.Enabled).toBe(0);
	});
});