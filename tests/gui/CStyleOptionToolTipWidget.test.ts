import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionToolTipWidget } from "../../src/gui/CStyleOptionToolTipWidget.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CToolTipWidget } from "../../src/widgets/CToolTipWidget.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionToolTip", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionToolTipWidget();

		expect(option.text).toBe("");
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const toolTip = new CToolTipWidget();

		toolTip.setText("Tooltip text");
		toolTip.setGeometry(10, 20, 150, 30);

		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(toolTip);

		const copy = new CStyleOptionToolTipWidget(option);

		expect(copy.text).toBe("Tooltip text");
		expect(copy.rect.width()).toBe(150);
		expect(copy.rect.height()).toBe(30);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromToolTip initializes base option", () => {
		const toolTip = new CToolTipWidget();

		toolTip.setGeometry(10, 20, 150, 30);

		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(toolTip);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(150);
		expect(option.rect.height()).toBe(30);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromToolTip copies text", () => {
		const toolTip = new CToolTipWidget();

		toolTip.setText("Hello tooltip");

		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(toolTip);

		expect(option.text).toBe("Hello tooltip");
	});

	test("initFromToolTip reflects disabled state", () => {
		const toolTip = new CToolTipWidget();

		toolTip.setEnabled(false);

		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(toolTip);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromToolTip reflects focus state", () => {
		const toolTip = new CToolTipWidget();

		toolTip.setFocusPolicy(CFocusPolicy.StrongFocus);
		toolTip.setFocus();

		const option = new CStyleOptionToolTipWidget();
		option.initFromToolTip(toolTip);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces text and state", () => {
		const toolTip = new CToolTipWidget();
		const option = new CStyleOptionToolTipWidget();

		toolTip.setText("First");
		toolTip.setEnabled(false);
		option.initFromToolTip(toolTip);

		expect(option.text).toBe("First");
		expect(option.state & CStyleState.Enabled).toBe(0);

		toolTip.setText("Second");
		toolTip.setEnabled(true);
		option.initFromToolTip(toolTip);

		expect(option.text).toBe("Second");
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});
});