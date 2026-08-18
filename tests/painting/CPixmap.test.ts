import {describe, expect, test} from "vitest";

import { CPixmap } from "../../src/painting/CPixmap";

describe("CPixmap", () => {
	test("stores image and dimensions", () => {
		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 48, 32);

		expect(pixmap.image()).toBe(image);
		expect(pixmap.width()).toBe(48);
		expect(pixmap.height()).toBe(32);
		expect(pixmap.isNull()).toBe(false);
	});

	test("is null when width is zero", () => {
		const pixmap = new CPixmap(
			{} as CanvasImageSource,
			0,
			48
		);

		expect(pixmap.isNull()).toBe(true);
	});

	test("is null when height is zero", () => {
		const pixmap = new CPixmap(
			{} as CanvasImageSource,
			48,
			0
		);

		expect(pixmap.isNull()).toBe(true);
	});
});