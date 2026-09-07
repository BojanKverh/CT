import { describe, expect, test } from "vitest";
import {
	CContextMenuEvent,
	CContextMenuReason
} from "../../src/events/CContextMenuEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";

describe("CContextMenuEvent", () => {
	test("has context menu event type", () => {
		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(event.type()).toBe(CEventType.ContextMenu);
	});

	test("stores reason", () => {
		const event = new CContextMenuEvent(
			CContextMenuReason.Keyboard,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(event.reason()).toBe(CContextMenuReason.Keyboard);
	});

	test("stores local position", () => {
		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(event.pos().x()).toBe(10);
		expect(event.pos().y()).toBe(20);
	});

	test("stores global position", () => {
		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(event.globalPos().x()).toBe(100);
		expect(event.globalPos().y()).toBe(200);
	});

	test("mouse reason is distinct from keyboard reason", () => {
		const mouseEvent = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(),
			new CPoint()
		);

		const keyboardEvent = new CContextMenuEvent(
			CContextMenuReason.Keyboard,
			new CPoint(),
			new CPoint()
		);

		expect(mouseEvent.reason()).toBe(CContextMenuReason.Mouse);
		expect(keyboardEvent.reason()).toBe(CContextMenuReason.Keyboard);
		expect(mouseEvent.reason()).not.toBe(keyboardEvent.reason());
	});
});