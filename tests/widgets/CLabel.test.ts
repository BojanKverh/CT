import {afterEach, beforeEach, describe, expect, test } from "vitest";
import { CAlignment } from "../../src/core/CAlignment.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { CColor } from "../../src/gui/CColor.js";
import { CPalette, CPaletteColorRole} from "../../src/gui/CPalette.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CFrame } from "../../src/index.js";

class TestLabel extends CLabel {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CLabel", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		CApplication.instance().destroy();
	});

	test("has empty text by default", () => {
		const label = new CLabel();

		expect(label.text()).toBe("");
	});

	test("sets text", () => {
		const label = new CLabel();

		label.setText("Hello");

		expect(label.text()).toBe("Hello");
	});

	test("uses left and vertical center alignment by default", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(label.alignment()).toBe(
			CAlignment.Left | CAlignment.VCenter
		);
		expect(device.engine.setTextAlign).toHaveBeenCalledWith("left");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 0, 20
		);
	});

	test("sets alignment", () => {
		const label = new CLabel();

		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);

		expect(label.alignment()).toBe(
			CAlignment.Right | CAlignment.Bottom
		);
	});

	test("draws text left and top aligned", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(CAlignment.Left | CAlignment.Top);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith("left");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith("top");
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 0, 0
		);
	});

	test("draws text centered", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(CAlignment.Center);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith(
			"center"
		);
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 100, 20
		);
	});

	test("draws text right and bottom aligned", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith("right");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"bottom"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 200, 40
		);
	});

	test("draws text using widget font", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setFont("18px serif");

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"18px serif"
		);
	});

    test("uses widget palette when painting", () => {
	    const label = new TestLabel();
	    label.resize(200, 40);
	    label.setText("Hello");

	    const palette = new CPalette();
	    palette.setColor(CPaletteColorRole.Base, new CColor(10, 20, 30) );
	    palette.setColor(CPaletteColorRole.Text, new CColor(200, 210, 220));

	    label.setPalette(palette);
	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);
    	label.paint(painter);

	    expect(device.engine.setFillStyle).toHaveBeenCalledWith(
		    "rgba(10, 20, 30, 1)"
	    );
		expect(device.engine.setStrokeStyle).toHaveBeenCalledWith(
			"rgba(200, 210, 220, 1)");
    });

	test("stores pixmap", () => {
		const label = new CLabel();
		const pixmap = new CPixmap({} as CanvasImageSource, 48, 48);
		label.setPixmap(pixmap);
		expect(label.pixmap()).toBe(pixmap);
	});

	test("pixmap is null by default", () => {
		const label = new CLabel();
		expect(label.pixmap()).toBeNull();
	});

	test("pixmap can be cleared", () => {
		const label = new CLabel();
		const pixmap = new CPixmap({} as CanvasImageSource, 48, 48);
		label.setPixmap(pixmap);
		label.setPixmap(null);
		expect(label.pixmap()).toBeNull();
	});

	test("draws pixmap centered", () => {
		const label = new TestLabel();
		label.resize(200, 100);

		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 48, 48);

		label.setPixmap(pixmap);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(image, 76, 26, 48, 48 );
	});

	test("scales larger pixmap down preserving aspect ratio", () => {
		const label = new TestLabel();
		label.resize(100, 100);

		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 200, 100);

		label.setPixmap(pixmap);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(pixmap, 3, 26.5, 94, 47);
	});

	test("inherits CFrame", () => {
		const label = new CLabel();

		expect(label).toBeInstanceOf(CFrame);
	});
});