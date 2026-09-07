import { describe, expect, test } from "vitest";
import { CDropEvent } from "../../src/events/CDropEvent.js";
import { CDropAction } from "../../src/events/CDropAction.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { CMimeData } from "../../src/core/CMimeData.js";

describe("CDropEvent", () => {
	test("has Drop event type", () => {
		const event = new CDropEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		expect(event.type()).toBe(CEventType.Drop);
	});

	test("stores position", () => {
		const event = new CDropEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		expect(event.pos().x()).toBe(10);
		expect(event.pos().y()).toBe(20);
	});

	test("stores MIME data", () => {
		const mimeData = new CMimeData();
		const event = new CDropEvent(new CPoint(), mimeData,
			CDropAction.CopyAction, CDropAction.CopyAction);

		expect(event.mimeData()).toBe(mimeData);
	});

	test("stores possible actions", () => {
		const actions = CDropAction.CopyAction |
			CDropAction.MoveAction;

		const event = new CDropEvent(new CPoint(), new CMimeData(),
			actions, CDropAction.CopyAction);

		expect(event.possibleActions()).toBe(actions);
	});

	test("stores proposed action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction | CDropAction.MoveAction,
			CDropAction.MoveAction);

		expect(event.proposedAction()).toBe(CDropAction.MoveAction);
	});

	test("drop action initially equals proposed action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction | CDropAction.MoveAction,
			CDropAction.MoveAction);

		expect(event.dropAction()).toBe(CDropAction.MoveAction);
	});

	test("sets drop action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction | CDropAction.MoveAction,
			CDropAction.CopyAction);

		event.setDropAction(CDropAction.MoveAction);

		expect(event.dropAction()).toBe(CDropAction.MoveAction);
	});

	test("rejects unsupported drop action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction, CDropAction.CopyAction);

		event.setDropAction(CDropAction.MoveAction);

		expect(event.dropAction()).toBe(CDropAction.CopyAction);
	});

	test("allows IgnoreAction as drop action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction, CDropAction.CopyAction);

		event.setDropAction(CDropAction.IgnoreAction);

		expect(event.dropAction()).toBe(CDropAction.IgnoreAction);
	});

	test("acceptProposedAction accepts event", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction, CDropAction.CopyAction);

		event.ignore();
		event.acceptProposedAction();

		expect(event.isAccepted()).toBe(true);
	});

	test("acceptProposedAction restores proposed action", () => {
		const event = new CDropEvent(new CPoint(), new CMimeData(),
			CDropAction.CopyAction | CDropAction.MoveAction,
			CDropAction.CopyAction);

		event.setDropAction(CDropAction.MoveAction);
		event.acceptProposedAction();

		expect(event.dropAction()).toBe(CDropAction.CopyAction);
	});
});