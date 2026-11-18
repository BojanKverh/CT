/**
 * Provides browser-native file selection helpers.
 */
export class CFileDialog
{
/**
	 * Opens the browser's native single-file picker and removes its temporary input when selection ends.
	 * @param accept Comma-separated MIME types, wildcards or extensions for the native picker. An empty string leaves the picker unrestricted.
	 * @returns A promise resolving to the selected `File`, or `null` on cancellation or an empty selection.
	 */
	static getOpenFile(
		accept = ""
	): Promise<File | null>
	{
		return new Promise(resolve =>
		{
			const input = CFileDialog.#createInput(
				accept,
				false
			);

			input.addEventListener("change", () =>
			{
				const file = input.files?.item(0) ?? null;

				input.remove();
				resolve(file);
			});

			input.addEventListener("cancel", () =>
			{
				input.remove();
				resolve(null);
			});

			CFileDialog.#open(input);
		});
	}

/**
	 * Opens the browser's native multiple-file picker and removes its temporary input when selection ends.
	 * @param accept Comma-separated MIME types, wildcards or extensions for the native picker. An empty string leaves the picker unrestricted.
	 * @returns A promise resolving to the selected files in picker order, or an empty array on cancellation or an empty selection.
	 */
	static getOpenFiles(
		accept = ""
	): Promise<File[]>
	{
		return new Promise(resolve =>
		{
			const input = CFileDialog.#createInput(
				accept,
				true
			);

			input.addEventListener("change", () =>
			{
				const files = input.files === null
					? []
					: Array.from(input.files);

				input.remove();
				resolve(files);
			});

			input.addEventListener("cancel", () =>
			{
				input.remove();
				resolve([]);
			});

			CFileDialog.#open(input);
		});
	}

	static #createInput(
		accept: string,
		multiple: boolean
	): HTMLInputElement
	{
		const input = document.createElement("input");

		input.type = "file";
		input.accept = accept;
		input.multiple = multiple;
		input.style.display = "none";

		return input;
	}

	static #open(input: HTMLInputElement): void
	{
		document.body.appendChild(input);
		input.click();
	}
}