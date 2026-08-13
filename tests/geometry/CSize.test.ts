import { describe, expect, test } from "vitest";
import { CSize } from "../../src/geometry/CSize";

describe("CSize", () => {
    test("creates a size with default dimensions", () => {
        const size = new CSize();

        expect(size.width()).toBe(0);
        expect(size.height()).toBe(0);
    });

    test("creates a size with specified dimensions", () => {
        const size = new CSize(100, 50);

        expect(size.width()).toBe(100);
        expect(size.height()).toBe(50);
    });

    test("resizes a size", () => {
        const size = new CSize(100, 50);

        size.resize(200, 150);

        expect(size.width()).toBe(200);
        expect(size.height()).toBe(150);
    });
});