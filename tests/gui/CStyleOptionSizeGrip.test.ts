import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionSizeGrip } from
	"../../src/gui/CStyleOptionSizeGrip.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CSizeGrip } from "../../src/widgets/CSizeGrip.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionSizeGrip", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default base values", () => {
		const option = new CStyleOptionSizeGrip();

		expect(option.rect.width()).toBe(0);
		expect(option.rect.height()).toBe(0);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies base values", () => {
		const sizeGrip = new CSizeGrip();
		sizeGrip.setGeometry(10, 20, 16, 16);

		const option = new CStyleOptionSizeGrip();
		option.initFromSizeGrip(sizeGrip);

		const copy = new CStyleOptionSizeGrip(option);

		expect(copy.rect.width()).toBe(16);
		expect(copy.rect.height()).toBe(16);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromSizeGrip initializes base option", () => {
		const sizeGrip = new CSizeGrip();
		sizeGrip.setGeometry(10, 20, 16, 16);
		sizeGrip.setEnabled(false);

		const option = new CStyleOptionSizeGrip();
		option.initFromSizeGrip(sizeGrip);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(16);
		expect(option.rect.height()).toBe(16);
		expect(option.state & CStyleState.Enabled).toBe(0);
	});
});