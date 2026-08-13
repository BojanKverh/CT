import { describe, expect, test } from "vitest";
import { CWidget } from "../../src/widgets/CWidget";

describe("CWidget", () => {
    test("creates a widget without a parent", () => {
        const widget = new CWidget();

        expect(widget.parent()).toBeNull();
        expect(widget.children()).toHaveLength(0);
    });

    test("creates a widget with a parent", () => {
        const parent = new CWidget();
        const child = new CWidget(parent);

        expect(child.parent()).toBe(parent);
        expect(parent.children()).toContain(child);
    });

    test("has empty geometry by default", () => {
        const widget = new CWidget();

        expect(widget.x()).toBe(0);
        expect(widget.y()).toBe(0);
        expect(widget.width()).toBe(0);
        expect(widget.height()).toBe(0);
    });

    test("sets widget geometry", () => {
        const widget = new CWidget();

        widget.setGeometry(10, 20, 100, 50);

        expect(widget.x()).toBe(10);
        expect(widget.y()).toBe(20);
        expect(widget.width()).toBe(100);
        expect(widget.height()).toBe(50);
    });

    test("moves a widget without changing its size", () => {
        const widget = new CWidget();

        widget.setGeometry(10, 20, 100, 50);
        widget.move(30, 40);

        expect(widget.x()).toBe(30);
        expect(widget.y()).toBe(40);
        expect(widget.width()).toBe(100);
        expect(widget.height()).toBe(50);
    });

    test("resizes a widget without changing its position", () => {
        const widget = new CWidget();

        widget.setGeometry(10, 20, 100, 50);
        widget.resize(200, 150);

        expect(widget.x()).toBe(10);
        expect(widget.y()).toBe(20);
        expect(widget.width()).toBe(200);
        expect(widget.height()).toBe(150);
    });

    test("returns widget geometry", () => {
        const widget = new CWidget();

        widget.setGeometry(10, 20, 100, 50);

        const geometry = widget.geometry();

        expect(geometry.x()).toBe(10);
        expect(geometry.y()).toBe(20);
        expect(geometry.width()).toBe(100);
        expect(geometry.height()).toBe(50);
    });

    test("returns a copy of widget geometry", () => {
        const widget = new CWidget();

        widget.setGeometry(10, 20, 100, 50);

        const geometry = widget.geometry();
        geometry.setGeometry(30, 40, 200, 150);

        expect(widget.x()).toBe(10);
        expect(widget.y()).toBe(20);
        expect(widget.width()).toBe(100);
        expect(widget.height()).toBe(50);
    });

    test("is visible by default", () => {
        const widget = new CWidget();

        expect(widget.isVisible()).toBe(true);
    });

    test("changes visibility", () => {
        const widget = new CWidget();

        widget.setVisible(false);
        expect(widget.isVisible()).toBe(false);

        widget.setVisible(true);
        expect(widget.isVisible()).toBe(true);
    });

    test("hides a widget", () => {
        const widget = new CWidget();

        widget.hide();

        expect(widget.isVisible()).toBe(false);
    });

    test("shows a hidden widget", () => {
        const widget = new CWidget();

        widget.hide();
        widget.show();

        expect(widget.isVisible()).toBe(true);
    });

    test("is enabled by default", () => {
        const widget = new CWidget();

        expect(widget.isEnabled()).toBe(true);
    });

    test("changes enabled state", () => {
        const widget = new CWidget();

        widget.setEnabled(false);
        expect(widget.isEnabled()).toBe(false);

        widget.setEnabled(true);
        expect(widget.isEnabled()).toBe(true);
    });

    test("reparents a widget", () => {
        const parent1 = new CWidget();
        const parent2 = new CWidget();
        const child = new CWidget(parent1);

        child.setParent(parent2);

        expect(child.parent()).toBe(parent2);
        expect(parent1.children()).not.toContain(child);
        expect(parent2.children()).toContain(child);
    });

    test("keeps child geometry relative to its parent", () => {
        const parent = new CWidget();
        const child = new CWidget(parent);

        parent.setGeometry(100, 50, 400, 300);
        child.setGeometry(20, 30, 100, 40);

        parent.move(200, 150);

        expect(child.x()).toBe(20);
        expect(child.y()).toBe(30);
        expect(child.width()).toBe(100);
        expect(child.height()).toBe(40);
    });

    test("keeps child geometry unchanged when reparented", () => {
        const parent1 = new CWidget();
        const parent2 = new CWidget();
        const child = new CWidget(parent1);

        child.setGeometry(20, 30, 100, 40);
        child.setParent(parent2);

        expect(child.x()).toBe(20);
        expect(child.y()).toBe(30);
        expect(child.width()).toBe(100);
        expect(child.height()).toBe(40);
    });
});