import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionSplitterHandle } from
	"../../src/gui/CStyleOptionSplitterHandle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CSplitter } from "../../src/widgets/CSplitter.js";
import { CSplitterHandle } from "../../src/widgets/CSplitterHandle.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionSplitterHandle", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionSplitterHandle();

		expect(option.orientation).toBe(COrientation.Horizontal);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const splitter = new CSplitter(COrientation.Vertical);
		const handle = new CSplitterHandle(
			COrientation.Vertical, splitter, 1
		);

		handle.setGeometry(10, 20, 100, 6);

		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(handle);

		const copy = new CStyleOptionSplitterHandle(option);

		expect(copy.orientation).toBe(COrientation.Vertical);
		expect(copy.rect.width()).toBe(100);
		expect(copy.rect.height()).toBe(6);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromSplitterHandle initializes base option", () => {
		const splitter = new CSplitter();
		const handle = new CSplitterHandle(
			COrientation.Horizontal, splitter, 1
		);

		handle.setGeometry(10, 20, 6, 200);

		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(handle);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(6);
		expect(option.rect.height()).toBe(200);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromSplitterHandle copies orientation", () => {
		const splitter = new CSplitter(COrientation.Vertical);
		const handle = new CSplitterHandle(
			COrientation.Vertical, splitter, 1
		);

		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(handle);

		expect(option.orientation).toBe(COrientation.Vertical);
	});

	test("initFromSplitterHandle reflects disabled state", () => {
		const splitter = new CSplitter();
		const handle = new CSplitterHandle(
			COrientation.Horizontal, splitter, 1
		);

		handle.setEnabled(false);

		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(handle);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("reinitializing replaces orientation", () => {
		const splitter = new CSplitter();
		const handle = new CSplitterHandle(
			COrientation.Horizontal, splitter, 1
		);

		const option = new CStyleOptionSplitterHandle();
		option.initFromSplitterHandle(handle);

		handle.setOrientation(COrientation.Vertical);
		option.initFromSplitterHandle(handle);

		expect(option.orientation).toBe(COrientation.Vertical);
	});
});