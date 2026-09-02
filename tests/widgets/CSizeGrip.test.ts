import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CSizeGrip } from "../../src/widgets/CSizeGrip.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CMouseButton, CMouseEvent} from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CApplication } from "../../src/core/CApplication.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CSizeGrip", () => {
    beforeEach(() => {
		new CApplication(createTestCanvas());
	});

    afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has fixed size matching sizeHint", () => {
		const parent = new CWidget();
		const grip = new CSizeGrip(parent);

		expect(grip.width()).toBe(grip.sizeHint().width());
		expect(grip.height()).toBe(grip.sizeHint().height());
		expect(grip.minimumWidth()).toBe(grip.sizeHint().width());
		expect(grip.minimumHeight()).toBe(grip.sizeHint().height());
		expect(grip.maximumWidth()).toBe(grip.sizeHint().width());
		expect(grip.maximumHeight()).toBe(grip.sizeHint().height());
	});

	test("sizeHint returns 16x16", () => {
		const parent = new CWidget();
		const grip = new CSizeGrip(parent);

		expect(grip.sizeHint().width()).toBe(16);
		expect(grip.sizeHint().height()).toBe(16);
	});

	test("left mouse drag resizes parent", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 58, 38, CMouseButton.NoButton));

		expect(parent.width()).toBe(350);
		expect(parent.height()).toBe(230);
	});

	test("drag can make parent smaller", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);
		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, -42, -22, CMouseButton.NoButton));

		expect(parent.width()).toBe(250);
		expect(parent.height()).toBe(170);
	});

	test("respects parent minimum size", () => {
		const parent = new CWidget();
		parent.resize(300, 200);
		parent.setMinimumSize(250, 150);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, -192, -192, CMouseButton.NoButton));

		expect(parent.width()).toBe(250);
		expect(parent.height()).toBe(150);
	});

	test("respects parent maximum size", () => {
		const parent = new CWidget();
		parent.resize(300, 200);
		parent.setMaximumSize(350, 250);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 208, 208, CMouseButton.NoButton));

		expect(parent.width()).toBe(350);
		expect(parent.height()).toBe(250);
	});

	test("moves to bottom right after resizing parent", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 58, 38, CMouseButton.NoButton));

		expect(grip.x()).toBe(parent.width() - grip.width());
		expect(grip.y()).toBe(parent.height() - grip.height());
	});

	test("mouse move without press does not resize parent", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);
		grip.event(new CMouseEvent(CEventType.MouseMove, 50, 50, CMouseButton.NoButton));

		expect(parent.width()).toBe(300);
		expect(parent.height()).toBe(200);
	});

	test("right mouse press does not start resize", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.RightButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 58, 38, CMouseButton.NoButton));

		expect(parent.width()).toBe(300);
		expect(parent.height()).toBe(200);
	});

	test("mouse release stops resizing", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 58, 38, CMouseButton.NoButton));

		expect(parent.width()).toBe(350);
		expect(parent.height()).toBe(230);

		grip.event(new CMouseEvent(CEventType.MouseRelease, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, 108, 88, CMouseButton.NoButton));

		expect(parent.width()).toBe(350);
		expect(parent.height()).toBe(230);
	});

	test("minimum and maximum constraints apply independently", () => {
		const parent = new CWidget();
		parent.resize(300, 200);
		parent.setMinimumSize(250, 100);
		parent.setMaximumSize(400, 220);

		const grip = new CSizeGrip(parent);
		grip.move(284, 184);

		grip.event(new CMouseEvent(CEventType.MousePress, 8, 8, CMouseButton.LeftButton));
		grip.event(new CMouseEvent(CEventType.MouseMove, -92, 108, CMouseButton.NoButton));

		expect(parent.width()).toBe(250);
		expect(parent.height()).toBe(220);
	});
});