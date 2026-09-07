import { describe, expect, test } from "vitest";
import { CDragMoveEvent } from "../../src/events/CDragMoveEvent.js";
import { CDropAction } from "../../src/events/CDropAction.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { CMimeData } from "../../src/core/CMimeData.js";

describe("CDragMoveEvent", () => {
	test("has DragMove event type", () => {
		const event = new CDragMoveEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		expect(event.type()).toBe(CEventType.DragMove);
	});

	test("inherits drop event data", () => {
		const mimeData = new CMimeData();
		const actions = CDropAction.CopyAction |
			CDropAction.MoveAction;

		const event = new CDragMoveEvent(new CPoint(10, 20),
			mimeData, actions, CDropAction.MoveAction);

		expect(event.pos().x()).toBe(10);
		expect(event.pos().y()).toBe(20);
		expect(event.mimeData()).toBe(mimeData);
		expect(event.possibleActions()).toBe(actions);
		expect(event.proposedAction()).toBe(CDropAction.MoveAction);
	});

	test("supports changing drop action", () => {
		const event = new CDragMoveEvent(new CPoint(),
			new CMimeData(), CDropAction.CopyAction |
			CDropAction.MoveAction, CDropAction.CopyAction);

		event.setDropAction(CDropAction.MoveAction);

		expect(event.dropAction()).toBe(CDropAction.MoveAction);
	});

	test("supports accepting proposed action", () => {
		const event = new CDragMoveEvent(new CPoint(),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		event.acceptProposedAction();

		expect(event.isAccepted()).toBe(true);
		expect(event.dropAction()).toBe(CDropAction.CopyAction);
	});
});