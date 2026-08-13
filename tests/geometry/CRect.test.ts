import { describe, expect, test } from "vitest";
import { CPoint } from "../../src/geometry/CPoint";
import { CRect } from "../../src/geometry/CRect";

describe("CRect", () => {
    test("creates an empty rectangle by default", () => {
        const rect = new CRect();

        expect(rect.x()).toBe(0);
        expect(rect.y()).toBe(0);
        expect(rect.width()).toBe(0);
        expect(rect.height()).toBe(0);
    });

    test("creates a rectangle with specified geometry", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.x()).toBe(10);
        expect(rect.y()).toBe(20);
        expect(rect.width()).toBe(100);
        expect(rect.height()).toBe(50);
    });

    test("calculates right and bottom edges", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.right()).toBe(110);
        expect(rect.bottom()).toBe(70);
    });

    test("changes rectangle geometry", () => {
        const rect = new CRect(10, 20, 100, 50);

        rect.setGeometry(30, 40, 200, 150);

        expect(rect.x()).toBe(30);
        expect(rect.y()).toBe(40);
        expect(rect.width()).toBe(200);
        expect(rect.height()).toBe(150);
        expect(rect.right()).toBe(230);
        expect(rect.bottom()).toBe(190);
    });

    test("contains a point inside the rectangle", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.contains(new CPoint(50, 40))).toBe(true);
    });

    test("contains the top-left point", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.contains(new CPoint(10, 20))).toBe(true);
    });

    test("does not contain points on the right or bottom edge", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.contains(new CPoint(110, 20))).toBe(false);
        expect(rect.contains(new CPoint(10, 70))).toBe(false);
        expect(rect.contains(new CPoint(110, 70))).toBe(false);
    });

    test("does not contain a point outside the rectangle", () => {
        const rect = new CRect(10, 20, 100, 50);

        expect(rect.contains(new CPoint(9, 20))).toBe(false);
        expect(rect.contains(new CPoint(10, 19))).toBe(false);
        expect(rect.contains(new CPoint(200, 200))).toBe(false);
    });

    test("intersects an overlapping rectangle", () => {
        const rect1 = new CRect(10, 10, 100, 100);
        const rect2 = new CRect(50, 50, 100, 100);

        expect(rect1.intersects(rect2)).toBe(true);
        expect(rect2.intersects(rect1)).toBe(true);
    });

    test("intersects a rectangle completely contained inside it", () => {
        const outer = new CRect(10, 10, 100, 100);
        const inner = new CRect(20, 20, 30, 30);

        expect(outer.intersects(inner)).toBe(true);
        expect(inner.intersects(outer)).toBe(true);
    });

    test("does not intersect a separate rectangle", () => {
        const rect1 = new CRect(10, 10, 50, 50);
        const rect2 = new CRect(100, 100, 50, 50);

        expect(rect1.intersects(rect2)).toBe(false);
        expect(rect2.intersects(rect1)).toBe(false);
    });

    test("does not intersect a rectangle touching only the right edge", () => {
        const rect1 = new CRect(0, 0, 100, 100);
        const rect2 = new CRect(100, 0, 100, 100);

        expect(rect1.intersects(rect2)).toBe(false);
        expect(rect2.intersects(rect1)).toBe(false);
    });

    test("does not intersect a rectangle touching only the bottom edge", () => {
        const rect1 = new CRect(0, 0, 100, 100);
        const rect2 = new CRect(0, 100, 100, 100);

        expect(rect1.intersects(rect2)).toBe(false);
        expect(rect2.intersects(rect1)).toBe(false);
    });

    test("calculates rectangle intersection", () => {
        const rect1 = new CRect(10, 10, 100, 100);
        const rect2 = new CRect(50, 40, 100, 100);

        const intersection = rect1.intersection(rect2);

        expect(intersection.x()).toBe(50);
        expect(intersection.y()).toBe(40);
        expect(intersection.width()).toBe(60);
        expect(intersection.height()).toBe(70);
    });

    test("returns the contained rectangle as intersection", () => {
        const outer = new CRect(10, 10, 100, 100);
        const inner = new CRect(20, 30, 40, 50);

        const intersection = outer.intersection(inner);

        expect(intersection.x()).toBe(20);
        expect(intersection.y()).toBe(30);
        expect(intersection.width()).toBe(40);
        expect(intersection.height()).toBe(50);
    });

    test("returns an empty rectangle when rectangles do not intersect", () => {
        const rect1 = new CRect(0, 0, 50, 50);
        const rect2 = new CRect(100, 100, 50, 50);

        const intersection = rect1.intersection(rect2);

        expect(intersection.x()).toBe(0);
        expect(intersection.y()).toBe(0);
        expect(intersection.width()).toBe(0);
        expect(intersection.height()).toBe(0);
    });

    test("returns an empty rectangle when rectangles only touch", () => {
        const rect1 = new CRect(0, 0, 100, 100);
        const rect2 = new CRect(100, 0, 100, 100);

        const intersection = rect1.intersection(rect2);

        expect(intersection.width()).toBe(0);
        expect(intersection.height()).toBe(0);
    });
});