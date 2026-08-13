import { describe, expect, test } from "vitest";
import { CCanvasPaintDevice } from "../../src/painting/CCanvasPaintDevice";
import { CCanvasPaintEngine } from "../../src/painting/CCanvasPaintEngine";

function createCanvas(
    width = 800,
    height = 600
): HTMLCanvasElement {
    const context = {} as CanvasRenderingContext2D;

    return {
        width,
        height,

        getContext: (type: string) => {
            if (type === "2d")
                return context;

            return null;
        }
    } as HTMLCanvasElement;
}

describe("CCanvasPaintDevice", () => {
    test("stores canvas dimensions", () => {
        const canvas = createCanvas(800, 600);

        const device = new CCanvasPaintDevice(canvas);

        expect(device.width()).toBe(800);
        expect(device.height()).toBe(600);
    });

    test("returns the canvas", () => {
        const canvas = createCanvas();

        const device = new CCanvasPaintDevice(canvas);

        expect(device.canvas()).toBe(canvas);
    });

    test("provides a canvas paint engine", () => {
        const canvas = createCanvas();

        const device = new CCanvasPaintDevice(canvas);

        expect(device.paintEngine()).toBeInstanceOf(CCanvasPaintEngine);
    });

    test("returns the same paint engine instance", () => {
        const canvas = createCanvas();

        const device = new CCanvasPaintDevice(canvas);

        const engine1 = device.paintEngine();
        const engine2 = device.paintEngine();

        expect(engine1).toBe(engine2);
    });

    test("throws when 2D context cannot be created", () => {
        const canvas = {
            width: 800,
            height: 600,

            getContext: () => null
        } as unknown as HTMLCanvasElement;

        expect(() => {
            new CCanvasPaintDevice(canvas);
        }).toThrow("Unable to create 2D canvas rendering context.");
    });
});