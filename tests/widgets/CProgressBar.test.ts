import {afterEach, beforeEach, describe, expect, test } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CProgressBar } from "../../src/widgets/CProgressBar.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CColor } from "../../src/gui/CColor.js";
import { CPalette, CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { CRect } from "../../src/geometry/CRect.js";

class TestProgressBar extends CProgressBar {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CProgressBar", () => {
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

	test("has default minimum", () => {
		const progressBar = new CProgressBar();

		expect(progressBar.minimum()).toBe(0);
	});

	test("has default maximum", () => {
		const progressBar = new CProgressBar();

		expect(progressBar.maximum()).toBe(100);
	});

	test("has default value", () => {
		const progressBar = new CProgressBar();

		expect(progressBar.value()).toBe(0);
	});

	test("sets value", () => {
		const progressBar = new CProgressBar();

		progressBar.setValue(42);

		expect(progressBar.value()).toBe(42);
	});

	test("clamps value to minimum", () => {
		const progressBar = new CProgressBar();

		progressBar.setValue(-10);

		expect(progressBar.value()).toBe(0);
	});

	test("clamps value to maximum", () => {
		const progressBar = new CProgressBar();

		progressBar.setValue(150);

		expect(progressBar.value()).toBe(100);
	});

	test("sets range", () => {
		const progressBar = new CProgressBar();

		progressBar.setRange(10, 80);

		expect(progressBar.minimum()).toBe(10);
		expect(progressBar.maximum()).toBe(80);
	});

	test("clamps value when minimum increases above current value", () => {
		const progressBar = new CProgressBar();
		progressBar.setValue(20);

		progressBar.setRange(30, 100);

		expect(progressBar.value()).toBe(30);
	});

	test("clamps value when maximum decreases below current value", () => {
		const progressBar = new CProgressBar();
		progressBar.setValue(80);

		progressBar.setRange(0, 50);

		expect(progressBar.value()).toBe(50);
	});

	test("keeps value when new range still contains it", () => {
		const progressBar = new CProgressBar();
		progressBar.setValue(50);

		progressBar.setRange(10, 90);

		expect(progressBar.value()).toBe(50);
	});

	test("sets maximum to minimum when minimum is greater than maximum", () => {
		const progressBar = new CProgressBar();

		progressBar.setRange(80, 20);

		expect(progressBar.minimum()).toBe(80);
		expect(progressBar.maximum()).toBe(80);
		expect(progressBar.value()).toBe(80);
	});

	test("sets minimum", () => {
		const progressBar = new CProgressBar();

		progressBar.setMinimum(25);

		expect(progressBar.minimum()).toBe(25);
		expect(progressBar.maximum()).toBe(100);
	});

	test("sets maximum", () => {
		const progressBar = new CProgressBar();

		progressBar.setMaximum(75);

		expect(progressBar.minimum()).toBe(0);
		expect(progressBar.maximum()).toBe(75);
	});

	test("setting minimum clamps value", () => {
		const progressBar = new CProgressBar();
		progressBar.setValue(10);

		progressBar.setMinimum(20);

		expect(progressBar.value()).toBe(20);
	});

	test("setting maximum clamps value", () => {
		const progressBar = new CProgressBar();
		progressBar.setValue(90);

		progressBar.setMaximum(60);

		expect(progressBar.value()).toBe(60);
	});

	test("reset sets value to minimum", () => {
		const progressBar = new CProgressBar();
		progressBar.setRange(20, 100);
		progressBar.setValue(70);

		progressBar.reset();

		expect(progressBar.value()).toBe(20);
	});

	test("reset keeps value unchanged when already at minimum", () => {
		const progressBar = new CProgressBar();
		progressBar.setRange(20, 100);

		progressBar.reset();

		expect(progressBar.value()).toBe(20);
	});

	test("paints background", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.setFillStyle).toHaveBeenCalledWith(
			"rgba(255, 255, 255, 1)"
		);
	});

	test("paints progress fill according to value", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setValue(50);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.fillRect).toHaveBeenCalledWith(0, 0, 100, 20);
	});

	test("paints empty progress at minimum", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setValue(0);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.fillRect).toHaveBeenCalledWith(0, 0, 0, 20);
	});

	test("paints full progress at maximum", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setValue(100);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.fillRect).toHaveBeenCalledWith(0, 0, 200, 20);
	});

	test("paints percentage text", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setValue(53);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.drawText).toHaveBeenCalledWith("53 %", 100, 10);
	});

	test("calculates percentage from custom range", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setRange(20, 60);
		progressBar.setValue(40);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);

		expect(device.engine.fillRect).toHaveBeenCalledWith(0, 0, 100, 20);

		expect(device.engine.drawText).toHaveBeenCalledWith("50 %", 100, 10);
	});

	test("uses widget palette when painting", () => {
		const progressBar = new TestProgressBar();
		progressBar.resize(200, 20);
		progressBar.setValue(50);

		const palette = new CPalette();
		palette.setColor(CPaletteColorRole.Base, new CColor(10, 20, 30));
		palette.setColor(CPaletteColorRole.Highlight, new CColor(40, 50, 60));

		progressBar.setPalette(palette);
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		progressBar.paint(painter);
		expect(device.engine.setFillStyle).toHaveBeenCalledWith("rgba(10, 20, 30, 1)");
		expect(device.engine.setFillStyle).toHaveBeenCalledWith("rgba(40, 50, 60, 1)");
	});
});