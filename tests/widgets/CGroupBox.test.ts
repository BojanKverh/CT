import {afterEach, beforeEach, describe, expect, test} from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CGroupBox } from "../../src/widgets/CGroupBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";

class TestGroupBox extends CGroupBox {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CGroupBox", () => {
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

	test("has empty title by default", () => {
		const groupBox = new CGroupBox();

		expect(groupBox.title()).toBe("");
	});

	test("stores title from constructor", () => {
		const groupBox = new CGroupBox("Settings");

		expect(groupBox.title()).toBe("Settings");
	});

	test("sets title", () => {
		const groupBox = new CGroupBox();

		groupBox.setTitle("Options");

		expect(groupBox.title()).toBe("Options");
	});

	test("keeps title unchanged when setting same title", () => {
		const groupBox = new CGroupBox("Settings");

		groupBox.setTitle("Settings");

		expect(groupBox.title()).toBe("Settings");
	});

	test("stores parent from constructor", () => {
		const parent = new CWidget();
		const groupBox = new CGroupBox("Settings", parent);

		expect(groupBox.parent()).toBe(parent);
	});

	test("can contain child widgets", () => {
		const groupBox = new CGroupBox("Settings");
		const child = new CWidget(groupBox);

		expect(child.parent()).toBe(groupBox);
		expect(groupBox.children()).toContain(child);
	});

	test("paints title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Settings",
			expect.any(Number),
			8
		);
	});

	test("paints frame sides and bottom", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0, 8, 0, 150
		);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			300, 8, 300, 150
		);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0, 150, 300, 150
		);
	});

	test("paints top-left frame segment before title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.drawLine).toHaveBeenCalledWith(
			0, 8, 8, 8
		);
	});

	test("leaves gap in top frame for title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		const calls = device.engine.drawLine.mock.calls;

		const leftTop = calls.find(
			call =>
				call[0] === 0 &&
				call[1] === 8 &&
				call[2] === 8 &&
				call[3] === 8
		);

		const rightTop = calls.find(
			call =>
				call[1] === 8 &&
				call[3] === 8 &&
				call[2] === 300
		);

		expect(leftTop).toBeDefined();
		expect(rightTop).toBeDefined();

		expect(rightTop![0]).toBeGreaterThan(8);
	});

	test("paints complete frame when title is empty", () => {
		const groupBox = new TestGroupBox();
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.strokeRect).toHaveBeenCalledWith(
			0,
			8,
			300,
			142
		);

		expect(device.engine.fillText).not.toHaveBeenCalled();
	});

	test("uses widget font when painting title", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalled();
	});

	test("uses widget palette when painting", () => {
		const groupBox = new TestGroupBox("Settings");
		groupBox.resize(300, 150);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		groupBox.paint(painter);

		expect(device.engine.setStrokeStyle).toHaveBeenCalled();
		expect(device.engine.setFillStyle).toHaveBeenCalled();
	});
});