import { describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CMimeData } from "../../src/core/CMimeData.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CDragEnterEvent } from "../../src/events/CDragEnterEvent.js";
import { CDragMoveEvent } from "../../src/events/CDragMoveEvent.js";
import { CDragLeaveEvent } from "../../src/events/CDragLeaveEvent.js";
import { CDropEvent } from "../../src/events/CDropEvent.js";
import { CDropAction } from "../../src/events/CDropAction.js";
import { CPoint } from "../../src/geometry/CPoint.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestWidget extends CWidget {
	dragEnter = vi.fn();
	dragMove = vi.fn();
	dragLeave = vi.fn();
	drop = vi.fn();

	protected override dragEnterEvent(event: CDragEnterEvent): void {
		this.dragEnter(event);
	}

	protected override dragMoveEvent(event: CDragMoveEvent): void {
		this.dragMove(event);
	}

	protected override dragLeaveEvent(event: CDragLeaveEvent): void {
		this.dragLeave(event);
	}

	protected override dropEvent(event: CDropEvent): void {
		this.drop(event);
	}
}

describe("CWidget drag and drop", () => {
	test("dispatches drag enter event", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new TestWidget();
		const event = new CDragEnterEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		widget.event(event);

		expect(widget.dragEnter).toHaveBeenCalledWith(event);

		app.destroy();
	});

	test("dispatches drag move event", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new TestWidget();
		const event = new CDragMoveEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		widget.event(event);

		expect(widget.dragMove).toHaveBeenCalledWith(event);

		app.destroy();
	});

	test("dispatches drag leave event", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new TestWidget();
		const event = new CDragLeaveEvent();

		widget.event(event);

		expect(widget.dragLeave).toHaveBeenCalledWith(event);

		app.destroy();
	});

	test("dispatches drop event", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new TestWidget();
		const event = new CDropEvent(new CPoint(10, 20),
			new CMimeData(), CDropAction.CopyAction,
			CDropAction.CopyAction);

		widget.event(event);

		expect(widget.drop).toHaveBeenCalledWith(event);

		app.destroy();
	});
});