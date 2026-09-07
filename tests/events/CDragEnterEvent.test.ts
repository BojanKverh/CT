import { describe, expect, test } from "vitest";
import { CDragEnterEvent } from "../../src/events/CDragEnterEvent.js";
import { CDragMoveEvent } from "../../src/events/CDragMoveEvent.js";
import { CDropEvent } from "../../src/events/CDropEvent.js";
import { CDropAction } from "../../src/events/CDropAction.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { CMimeData } from "../../src/core/CMimeData.js";

describe("CDragEnterEvent", () => {
	test("has DragEnter event type", () => {
		const event = new CDragEnterEvent(new CPoint(),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		expect(event.type()).toBe(CEventType.DragEnter);
	});

	test("inherits CDragMoveEvent", () => {
		const event = new CDragEnterEvent(new CPoint(),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		expect(event).toBeInstanceOf(CDragMoveEvent);
		expect(event).toBeInstanceOf(CDropEvent);
	});

	test("inherits drag event data", () => {
		const mimeData = new CMimeData();
		const event = new CDragEnterEvent(new CPoint(30, 40),
			mimeData, CDropAction.CopyAction |
			CDropAction.MoveAction, CDropAction.MoveAction);

		expect(event.pos().x()).toBe(30);
		expect(event.pos().y()).toBe(40);
		expect(event.mimeData()).toBe(mimeData);
		expect(event.proposedAction()).toBe(CDropAction.MoveAction);
	});

	test("supports accepting proposed action", () => {
		const event = new CDragEnterEvent(new CPoint(),
			new CMimeData(), CDropAction.MoveAction,
			CDropAction.MoveAction);

		event.acceptProposedAction();

		expect(event.isAccepted()).toBe(true);
		expect(event.dropAction()).toBe(CDropAction.MoveAction);
	});
});