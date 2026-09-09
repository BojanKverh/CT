import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionLabel } from "../../src/gui/CStyleOptionLabel.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CAlignment } from "../../src/core/CAlignment.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionLabel", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionLabel();

		expect(option.text).toBe("");
		expect(option.alignment).toBe(
			CAlignment.Left | CAlignment.VCenter
		);
		expect(option.pixmap).toBeNull();
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const label = new CLabel();

		label.setGeometry(10, 20, 200, 40);
		label.setText("Hello");
		label.setAlignment(
			CAlignment.HCenter | CAlignment.Bottom
		);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		const copy = new CStyleOptionLabel(option);

		expect(copy.text).toBe("Hello");
		expect(copy.alignment).toBe(
			CAlignment.HCenter | CAlignment.Bottom
		);
		expect(copy.rect.width()).toBe(200);
		expect(copy.rect.height()).toBe(40);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromLabel initializes base option", () => {
		const label = new CLabel();

		label.setGeometry(10, 20, 200, 40);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(40);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromLabel copies text and alignment", () => {
		const label = new CLabel();

		label.setText("Test label");
		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		expect(option.text).toBe("Test label");
		expect(option.alignment).toBe(
			CAlignment.Right | CAlignment.Bottom
		);
	});

	test("initFromLabel copies pixmap reference", () => {
		const label = new CLabel();
		const image = createTestCanvas();
		const pixmap = new CPixmap(image, 20, 10);

		label.setPixmap(pixmap);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		expect(option.pixmap).toBe(pixmap);
	});

	test("copy constructor keeps pixmap reference", () => {
		const label = new CLabel();
		const image = createTestCanvas();
		const pixmap = new CPixmap(image, 20, 10);

		label.setPixmap(pixmap);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		const copy = new CStyleOptionLabel(option);

		expect(copy.pixmap).toBe(pixmap);
	});

	test("initFromLabel reflects disabled state", () => {
		const label = new CLabel();

		label.setEnabled(false);

		const option = new CStyleOptionLabel();
		option.initFromLabel(label);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("reinitializing replaces label data", () => {
		const label = new CLabel();
		const option = new CStyleOptionLabel();

		label.setText("First");
		label.setAlignment(CAlignment.Left | CAlignment.Top);
		option.initFromLabel(label);

		label.setText("Second");
		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);
		option.initFromLabel(label);

		expect(option.text).toBe("Second");
		expect(option.alignment).toBe(
			CAlignment.Right | CAlignment.Bottom
		);
	});
});