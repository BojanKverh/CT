export class CFileDialog
{
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