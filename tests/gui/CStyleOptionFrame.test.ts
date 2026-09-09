import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionFrame } from "../../src/gui/CStyleOptionFrame.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CFrameShape, CFrameShadow } from
	"../../src/gui/CFrameStyle.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CFrame } from "../../src/widgets/CFrame.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionFrame", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionFrame();

		expect(option.frameShape).toBe(CFrameShape.NoFrame);
		expect(option.frameShadow).toBe(CFrameShadow.Plain);
		expect(option.lineWidth).toBe(1);
		expect(option.midLineWidth).toBe(0);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies frame values", () => {
		const frame = new CFrame();

		frame.setGeometry(10, 20, 200, 100);
		frame.setFrameShape(CFrameShape.Box);
		frame.setFrameShadow(CFrameShadow.Raised);
		frame.setLineWidth(3);
		frame.setMidLineWidth(2);

		const option = new CStyleOptionFrame();
		option.initFromFrame(frame);

		const copy = new CStyleOptionFrame(option);

		expect(copy.rect.width()).toBe(200);
		expect(copy.rect.height()).toBe(100);
		expect(copy.frameShape).toBe(CFrameShape.Box);
		expect(copy.frameShadow).toBe(CFrameShadow.Raised);
		expect(copy.lineWidth).toBe(3);
		expect(copy.midLineWidth).toBe(2);
	});

	test("initFromFrame initializes base option", () => {
		const frame = new CFrame();

		frame.setGeometry(10, 20, 200, 100);

		const option = new CStyleOptionFrame();
		option.initFromFrame(frame);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(100);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromFrame copies frame properties", () => {
		const frame = new CFrame();

		frame.setFrameShape(CFrameShape.Panel);
		frame.setFrameShadow(CFrameShadow.Sunken);
		frame.setLineWidth(4);
		frame.setMidLineWidth(2);

		const option = new CStyleOptionFrame();
		option.initFromFrame(frame);

		expect(option.frameShape).toBe(CFrameShape.Panel);
		expect(option.frameShadow).toBe(CFrameShadow.Sunken);
		expect(option.lineWidth).toBe(4);
		expect(option.midLineWidth).toBe(2);
	});

	test("initFromFrame reflects disabled state", () => {
		const frame = new CFrame();
		frame.setEnabled(false);

		const option = new CStyleOptionFrame();
		option.initFromFrame(frame);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromFrame reflects focus state", () => {
		const frame = new CFrame();

		frame.setFocusPolicy(CFocusPolicy.StrongFocus);
		frame.setFocus();

		const option = new CStyleOptionFrame();
		option.initFromFrame(frame);

		expect(option.state & CStyleState.HasFocus).not.toBe(0);
	});

	test("reinitializing replaces frame properties", () => {
		const first = new CFrame();

		first.setFrameShape(CFrameShape.Box);
		first.setFrameShadow(CFrameShadow.Raised);
		first.setLineWidth(4);
		first.setMidLineWidth(3);

		const second = new CFrame();

		second.setFrameShape(CFrameShape.Panel);
		second.setFrameShadow(CFrameShadow.Sunken);
		second.setLineWidth(2);
		second.setMidLineWidth(1);

		const option = new CStyleOptionFrame();

		option.initFromFrame(first);
		option.initFromFrame(second);

		expect(option.frameShape).toBe(CFrameShape.Panel);
		expect(option.frameShadow).toBe(CFrameShadow.Sunken);
		expect(option.lineWidth).toBe(2);
		expect(option.midLineWidth).toBe(1);
	});
});