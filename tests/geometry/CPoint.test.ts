import { describe, expect, test } from "vitest";
import { CPoint } from "../../src/geometry/CPoint";

describe("CPoint", () => {
    test("creates a point with default coordinates", () => {
        const point = new CPoint();

        expect(point.x()).toBe(0);
        expect(point.y()).toBe(0);
    });

    test("creates a point with specified coordinates", () => {
        const point = new CPoint(10, 20);

        expect(point.x()).toBe(10);
        expect(point.y()).toBe(20);
    });

    test("moves a point", () => {
        const point = new CPoint(10, 20);

        point.move(30, 40);

        expect(point.x()).toBe(30);
        expect(point.y()).toBe(40);
    });
});