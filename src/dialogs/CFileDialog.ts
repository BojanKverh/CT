/**
 * Provides browser-native file selection helpers.
 */
export class CFileDialog
{
/**
 * Opens a native file picker for selecting one file.
 *
 * @param accept Optional HTML file-type accept filter.
 * @returns A promise resolving to the selected file, or `null` if canceled.
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
 * Opens a native file picker for selecting multiple files.
 *
 * @param accept Optional HTML file-type accept filter.
 * @returns A promise resolving to the selected files, or an empty array if canceled.
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