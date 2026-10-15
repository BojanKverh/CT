import { describe, expect, test, vi } from "vitest";
import { CPainter } from "../../src/painting/CPainter";
import { CPaintDevice } from "../../src/painting/CPaintDevice";
import { CPaintEngine } from "../../src/painting/CPaintEngine";
import { CRect } from "../../src/geometry/CRect";
import { TestPaintEngine } from "../helpers/createTestPaintEngine";
import { CPixmap } from "../../src/painting/CPixmap";
import { CFont, CFontWeight } from "../../src/gui/CFont";

class TestPaintDevice extends CPaintDevice {
    readonly engine = new TestPaintEngine();

    width(): number {
        return 800;
    }

    height(): number {
        return 600;
    }

    paintEngine(): CPaintEngine {
        return this.engine;
    }
}

describe("CPainter", () => {
    test("stores the paint device", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        expect(painter.device()).toBe(device);
    });

    test("saves painter state", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.save();

        expect(device.engine.save).toHaveBeenCalledOnce();
    });

    test("restores painter state", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.restore();

        expect(device.engine.restore).toHaveBeenCalledOnce();
    });

    test("translates painter", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.translate(10, 20);

        expect(device.engine.translate).toHaveBeenCalledWith(10, 20);
    });

    test("clears a rectangle", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.clearRect(new CRect(10, 20, 100, 50));

        expect(device.engine.clearRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("fills a rectangle", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.fillRect(new CRect(10, 20, 100, 50));

        expect(device.engine.fillRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("strokes a rectangle", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.strokeRect(new CRect(10, 20, 100, 50));

        expect(device.engine.strokeRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("sets fill style", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.setFillStyle("#ff0000");

        expect(device.engine.setFillStyle).toHaveBeenCalledWith("#ff0000");
    });

    test("sets stroke style", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.setStrokeStyle("#00ff00");

        expect(device.engine.setStrokeStyle).toHaveBeenCalledWith("#00ff00");
    });

    test("sets line width", () => {
        const device = new TestPaintDevice();
        const painter = new CPainter(device);

        painter.setLineWidth(5);

        expect(device.engine.setLineWidth).toHaveBeenCalledWith(5);
    });

	test("clips to a rectangle", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		painter.clipRect(new CRect(10, 20, 100, 50));

		expect(device.engine.clipRect).toHaveBeenCalledWith(
			10, 20, 100, 50
		);
	});

    test("sets font", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		painter.setFont(new CFont("Arial", 16, CFontWeight.Bold, true));

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"italic 700 16px Arial"
		);
	});

	test("returns the current font as a CFont", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);
		device.engine.font.mockReturnValue("italic 700 16px Arial");

		const font = painter.font();

		expect(font.family()).toBe("Arial");
		expect(font.pixelSize()).toBe(16);
		expect(font.isBold()).toBe(true);
		expect(font.isItalic()).toBe(true);
	});

	test("sets text alignment", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		painter.setTextAlign("center");

		expect(device.engine.setTextAlign).toHaveBeenCalledWith("center");
	});

	test("sets text baseline", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		painter.setTextBaseline("middle");

		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
	});

	test("draws text", () => {
		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		painter.drawText("Hello", 10, 20);

		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 10, 20
		);
	});

    test("returns text width from paint engine", () => {
	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);
    	device.engine.textWidth.mockReturnValue(42);
    	expect(painter.textWidth("Hello")).toBe(42);
	    expect(device.engine.textWidth).toHaveBeenCalledWith("Hello");
    });

    test("draws line", () => {
	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);
    	painter.drawLine(10, 20, 30, 40);
    	expect(device.engine.drawLine).toHaveBeenCalledWith(10, 20, 30, 40);
    });

    test("drawPixmap delegates to paint engine", () => {
	    const image = {} as CanvasImageSource;
	    const pixmap = new CPixmap(image, 48, 48);
	    const device = new TestPaintDevice();
        const painter = new CPainter(device);
        painter.drawPixmap(pixmap, 10, 20);

	    expect(device.engine.drawPixmap).toHaveBeenCalledWith(pixmap, 10, 20, 48, 48);
    });
});
