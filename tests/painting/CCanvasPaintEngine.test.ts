import { describe, expect, test, vi } from "vitest";
import { CCanvasPaintEngine } from "../../src/painting/CCanvasPaintEngine";

function createContext(): CanvasRenderingContext2D {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
    	fillText: vi.fn(),

        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: "start",
    	textBaseline: "alphabetic"

    } as unknown as CanvasRenderingContext2D;
}

describe("CCanvasPaintEngine", () => {
    test("saves the rendering state", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.save();

        expect(context.save).toHaveBeenCalledOnce();
    });

    test("restores the rendering state", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.restore();

        expect(context.restore).toHaveBeenCalledOnce();
    });

    test("translates the rendering context", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.translate(10, 20);

        expect(context.translate).toHaveBeenCalledOnce();
        expect(context.translate).toHaveBeenCalledWith(10, 20);
    });

    test("fills a rectangle", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.fillRect(10, 20, 100, 50);

        expect(context.fillRect).toHaveBeenCalledOnce();
        expect(context.fillRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("strokes a rectangle", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.strokeRect(10, 20, 100, 50);

        expect(context.strokeRect).toHaveBeenCalledOnce();
        expect(context.strokeRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("clears a rectangle", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.clearRect(10, 20, 100, 50);

        expect(context.clearRect).toHaveBeenCalledOnce();
        expect(context.clearRect).toHaveBeenCalledWith(
            10,
            20,
            100,
            50
        );
    });

    test("sets the fill style", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.setFillStyle("#ff0000");

        expect(context.fillStyle).toBe("#ff0000");
    });

    test("sets the stroke style", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.setStrokeStyle("#00ff00");

        expect(context.strokeStyle).toBe("#00ff00");
    });

    test("sets the line width", () => {
        const context = createContext();
        const engine = new CCanvasPaintEngine(context);

        engine.setLineWidth(5);

        expect(context.lineWidth).toBe(5);
    });

	test("clips to a rectangle", () => {
		const context = createContext();
		const engine = new CCanvasPaintEngine(context);

		engine.clipRect(10, 20, 100, 50);

		expect(context.beginPath).toHaveBeenCalledOnce();
		expect(context.rect).toHaveBeenCalledWith(10, 20, 100, 50);
		expect(context.clip).toHaveBeenCalledOnce();
	});
    
	test("sets font", () => {
		const context = createContext();
		const engine = new CCanvasPaintEngine(context);

		engine.setFont("14px sans-serif");

		expect(context.font).toBe("14px sans-serif");
	});

	test("sets text alignment", () => {
		const context = createContext();
		const engine = new CCanvasPaintEngine(context);

		engine.setTextAlign("center");

		expect(context.textAlign).toBe("center");
	});

	test("sets text baseline", () => {
		const context = createContext();
		const engine = new CCanvasPaintEngine(context);

		engine.setTextBaseline("middle");

		expect(context.textBaseline).toBe("middle");
	});

	test("draws filled text", () => {
		const context = createContext();
		const engine = new CCanvasPaintEngine(context);

		engine.fillText("Hello", 10, 20);

		expect(context.fillText).toHaveBeenCalledWith("Hello", 10, 20);
	});
});