import { describe, expect, test } from "vitest";
import { CDrag } from "../../src/core/CDrag.js";
import { CMimeData } from "../../src/core/CMimeData.js";
import { CObject } from "../../src/core/CObject.js";
import { CDropAction } from "../../src/events/CDropAction.js";

describe("CDrag", () => {
	test("stores source", () => {
		const source = new CObject();
		const drag = new CDrag(source);

		expect(drag.source()).toBe(source);
	});

	test("has no MIME data by default", () => {
		const drag = new CDrag(new CObject());

		expect(drag.mimeData()).toBeNull();
	});

	test("sets MIME data", () => {
		const drag = new CDrag(new CObject());
		const mimeData = new CMimeData();

		drag.setMimeData(mimeData);

		expect(drag.mimeData()).toBe(mimeData);
	});

	test("clears MIME data", () => {
		const drag = new CDrag(new CObject());
		const mimeData = new CMimeData();

		drag.setMimeData(mimeData);
		drag.setMimeData(null);

		expect(drag.mimeData()).toBeNull();
	});

	test("is initially inactive", () => {
		const drag = new CDrag(new CObject());

		expect(drag.isActive()).toBe(false);
	});

	test("exec starts drag operation", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);

		expect(drag.isActive()).toBe(true);
	});

	test("exec stores supported actions", () => {
		const drag = new CDrag(new CObject());
		const actions = CDropAction.CopyAction |
			CDropAction.MoveAction;

		drag.exec(actions);

		expect(drag.supportedActions()).toBe(actions);
	});

	test("default action is IgnoreAction by default", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);

		expect(drag.defaultAction()).toBe(CDropAction.IgnoreAction);
	});

	test("exec stores supported default action", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction | CDropAction.MoveAction,
			CDropAction.MoveAction);

		expect(drag.defaultAction()).toBe(CDropAction.MoveAction);
	});

	test("unsupported default action becomes IgnoreAction", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction, CDropAction.MoveAction);

		expect(drag.defaultAction()).toBe(CDropAction.IgnoreAction);
	});

	test("drop action is IgnoreAction while drag starts", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);

		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);
	});

	test("finish stores resulting drop action", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction | CDropAction.MoveAction);
		drag.finish(CDropAction.MoveAction);

		expect(drag.dropAction()).toBe(CDropAction.MoveAction);
		expect(drag.isActive()).toBe(false);
	});

	test("finish rejects unsupported action", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);
		drag.finish(CDropAction.MoveAction);

		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);
		expect(drag.isActive()).toBe(false);
	});

	test("finish does nothing when drag is inactive", () => {
		const drag = new CDrag(new CObject());

		drag.finish(CDropAction.CopyAction);

		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);
		expect(drag.isActive()).toBe(false);
	});

	test("cancel finishes drag with IgnoreAction", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);
		drag.cancel();

		expect(drag.isActive()).toBe(false);
		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);
	});

	test("exec resets previous drop result", () => {
		const drag = new CDrag(new CObject());

		drag.exec(CDropAction.CopyAction);
		drag.finish(CDropAction.CopyAction);

		expect(drag.dropAction()).toBe(CDropAction.CopyAction);

		drag.exec(CDropAction.MoveAction);

		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);
		expect(drag.isActive()).toBe(true);
	});
});