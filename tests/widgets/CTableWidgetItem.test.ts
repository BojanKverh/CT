import { describe, expect, test } from "vitest";

import { CTableWidgetItem } from "../../src/widgets/CTableWidgetItem.js";

describe("CTableWidgetItem", () => {
	test("constructs with empty text", () => {
		const item = new CTableWidgetItem();

		expect(item.text()).toBe("");
	});

	test("constructs with text", () => {
		const item = new CTableWidgetItem("Hello");

		expect(item.text()).toBe("Hello");
	});

	test("setText changes text", () => {
		const item = new CTableWidgetItem("Old");

		item.setText("New");

		expect(item.text()).toBe("New");
	});

	test("setText allows empty string", () => {
		const item = new CTableWidgetItem("Text");

		item.setText("");

		expect(item.text()).toBe("");
	});

	test("supports unicode text", () => {
		const item = new CTableWidgetItem("Živjo 🌳");

		expect(item.text()).toBe("Živjo 🌳");
	});

	test("items store text independently", () => {
		const first = new CTableWidgetItem("First");
		const second = new CTableWidgetItem("Second");

		first.setText("Changed");

		expect(first.text()).toBe("Changed");
		expect(second.text()).toBe("Second");
	});
});