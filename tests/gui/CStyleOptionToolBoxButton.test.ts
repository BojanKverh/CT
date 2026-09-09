import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CStyleOptionToolBoxButton } from "../../src/gui/CStyleOptionToolBoxButton.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CToolBoxButton } from "../../src/widgets/CToolBoxButton.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionToolBoxButton", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionToolBoxButton();

		expect(option.text).toBe("");
		expect(option.current).toBe(false);
		expect(option.state).toBe(CStyleState.None);
	});

	test("copy constructor copies values", () => {
		const button = new CToolBoxButton();

		button.setText("General");
		button.setCurrent(true);
		button.setGeometry(10, 20, 200, 28);

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		const copy = new CStyleOptionToolBoxButton(option);

		expect(copy.text).toBe("General");
		expect(copy.current).toBe(true);
		expect(copy.rect.width()).toBe(200);
		expect(copy.rect.height()).toBe(28);
		expect(copy.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromToolBoxButton initializes base option", () => {
		const button = new CToolBoxButton();

		button.setGeometry(10, 20, 200, 28);

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		expect(option.rect.x()).toBe(0);
		expect(option.rect.y()).toBe(0);
		expect(option.rect.width()).toBe(200);
		expect(option.rect.height()).toBe(28);
		expect(option.state & CStyleState.Enabled).not.toBe(0);
	});

	test("initFromToolBoxButton copies text and current", () => {
		const button = new CToolBoxButton();

		button.setText("Network");
		button.setCurrent(true);

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		expect(option.text).toBe("Network");
		expect(option.current).toBe(true);
	});

	test("initFromToolBoxButton reflects disabled state", () => {
		const button = new CToolBoxButton();
		button.setEnabled(false);

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});

	test("initFromToolBoxButton reflects hovered state", () => {
		const button = new CToolBoxButton();

		button.event(new CMouseEvent(
			CEventType.MouseMove, 5, 5, CMouseButton.NoButton
		));

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		expect(option.state & CStyleState.MouseOver).not.toBe(0);
	});

	test("initFromToolBoxButton reflects down state", () => {
		const button = new CToolBoxButton();

		button.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));

		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(button);

		expect(option.state & CStyleState.Sunken).not.toBe(0);
	});

	test("reinitializing clears transient states", () => {
		const first = new CToolBoxButton();

		first.setText("First");
		first.setCurrent(true);
		first.event(new CMouseEvent(
			CEventType.MouseMove, 5, 5, CMouseButton.NoButton
		));
		first.event(new CMouseEvent(
			CEventType.MousePress, 5, 5, CMouseButton.LeftButton
		));

		const second = new CToolBoxButton();
		second.setText("Second");

		const option = new CStyleOptionToolBoxButton();

		option.initFromToolBoxButton(first);
		option.initFromToolBoxButton(second);

		expect(option.text).toBe("Second");
		expect(option.current).toBe(false);
		expect(option.state & CStyleState.MouseOver).toBe(0);
		expect(option.state & CStyleState.Sunken).toBe(0);
	});
});