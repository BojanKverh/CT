import {
	CSqlTableAdapter,
	type CSqlRow,
	type CSqlSelectRequest,
	type CSqlSelectResult
} from "./CSqlTableAdapter.js";
import { CSortOrder } from "../gui/CSortOrder.js";

/** Fetch-compatible function used to perform HTTP requests. */
export type CSqlFetch = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

export interface CFetchSqlTableAdapterOptions {
	/** Custom fetch implementation, primarily useful for tests and polyfills. */
	fetch?: CSqlFetch;

	/** Static headers or a function evaluated before every request. */
	headers?: HeadersInit | (() => HeadersInit);

	/** Static signal or a function returning the signal for the next request. */
	signal?: AbortSignal | (() => AbortSignal | undefined);

	/** Fetch credentials mode. */
	credentials?: RequestCredentials;
}

/** An HTTP failure returned by CFetchSqlTableAdapter. */
export class CFetchSqlError extends Error {
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
	readonly body: unknown;

	constructor(
		message: string,
		status: number,
		statusText: string,
		url: string,
		body: unknown = null
	) {
		super(message);
		this.name = "CFetchSqlError";
		this.status = status;
		this.statusText = statusText;
		this.url = url;
		this.body = body;
	}
}

/**
 * SQL table adapter backed by a conventional JSON REST API.
 *
 * Endpoints:
 * - GET    /:table?offset=&limit=&columns=
 * - POST   /:table
 * - PATCH  /:table/:primaryKey
 * - DELETE /:table/:primaryKey
 */
export class CFetchSqlTableAdapter extends CSqlTableAdapter {
	#m_baseUrl: string;
	#m_fetch: CSqlFetch;
	#m_headers: HeadersInit | (() => HeadersInit) | undefined;
	#m_signal: AbortSignal | (() => AbortSignal | undefined) | undefined;
	#m_credentials: RequestCredentials | undefined;

	constructor(
		baseUrl: string,
		options: CFetchSqlTableAdapterOptions = {}
	) {
		super();
		this.#m_baseUrl = baseUrl.replace(/\/+$/, "");
		this.#m_fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
		this.#m_headers = options.headers;
		this.#m_signal = options.signal;
		this.#m_credentials = options.credentials;
	}

	baseUrl(): string {
		return this.#m_baseUrl;
	}

	setBaseUrl(baseUrl: string): void {
		this.#m_baseUrl = baseUrl.replace(/\/+$/, "");
	}

	override async select(
		request: CSqlSelectRequest
	): Promise<CSqlSelectResult> {
		const query = new URLSearchParams({
			offset: String(request.offset),
			limit: String(request.limit)
		});
		if (request.columns.length > 0)
			query.set("columns", request.columns.join(","));
		if (request.sortColumn !== undefined) {
			query.set("sort", request.sortColumn);
			query.set(
				"order",
				request.sortOrder === CSortOrder.DescendingOrder ? "desc" : "asc"
			);
		}
		if (request.filters !== undefined && request.filters.length > 0)
			query.set("filters", JSON.stringify(request.filters));

		const url = `${this.#tableUrl(request.table)}?${query.toString()}`;
		const value = await this.#requestJson(url, "GET");

		if (!this.#isObject(value) || !Array.isArray(value.rows)
			|| !Number.isInteger(value.totalRowCount)
			|| (value.totalRowCount as number) < 0
			|| !value.rows.every(row => this.#isObject(row))) {
			throw new Error("Invalid select response: expected rows and totalRowCount.");
		}

		return {
			rows: value.rows as CSqlRow[],
			totalRowCount: value.totalRowCount as number
		};
	}

	override async insert(
		table: string,
		values: Readonly<CSqlRow>
	): Promise<CSqlRow> {
		const value = await this.#requestJson(
			this.#tableUrl(table),
			"POST",
			values
		);
		if (!this.#isObject(value))
			throw new Error("Invalid insert response: expected a row object.");
		return value;
	}

	override async update(
		table: string,
		_primaryKeyColumn: string,
		primaryKey: unknown,
		values: Readonly<CSqlRow>
	): Promise<void> {
		await this.#request(
			this.#recordUrl(table, primaryKey),
			"PATCH",
			values
		);
	}

	override async remove(
		table: string,
		_primaryKeyColumn: string,
		primaryKey: unknown
	): Promise<void> {
		await this.#request(this.#recordUrl(table, primaryKey), "DELETE");
	}

	#tableUrl(table: string): string {
		return `${this.#m_baseUrl}/${encodeURIComponent(table)}`;
	}

	#recordUrl(table: string, primaryKey: unknown): string {
		return `${this.#tableUrl(table)}/${encodeURIComponent(String(primaryKey))}`;
	}

	async #requestJson(
		url: string,
		method: string,
		body?: Readonly<CSqlRow>
	): Promise<CSqlRow> {
		const response = await this.#request(url, method, body);
		try {
			return await response.json() as CSqlRow;
		} catch {
			throw new Error(`Invalid JSON response from '${url}'.`);
		}
	}

	async #request(
		url: string,
		method: string,
		body?: Readonly<CSqlRow>
	): Promise<Response> {
		const headers = new Headers(this.#resolveHeaders());
		if (!headers.has("Accept"))
			headers.set("Accept", "application/json");
		if (body !== undefined && !headers.has("Content-Type"))
			headers.set("Content-Type", "application/json");

		const init: RequestInit = {
			method,
			headers
		};
		if (body !== undefined)
			init.body = JSON.stringify(body);

		const signal = this.#resolveSignal();
		if (signal !== undefined)
			init.signal = signal;
		if (this.#m_credentials !== undefined)
			init.credentials = this.#m_credentials;

		const response = await this.#m_fetch(url, init);

		if (!response.ok)
			throw await this.#httpError(response, url);
		return response;
	}

	#resolveHeaders(): HeadersInit | undefined {
		return typeof this.#m_headers === "function"
			? this.#m_headers()
			: this.#m_headers;
	}

	#resolveSignal(): AbortSignal | undefined {
		return typeof this.#m_signal === "function"
			? this.#m_signal()
			: this.#m_signal;
	}

	async #httpError(response: Response, url: string): Promise<CFetchSqlError> {
		let body: unknown = null;
		let message = `HTTP ${response.status} ${response.statusText}`.trim();

		const text = await response.text();
		if (text !== "") {
			try {
				body = JSON.parse(text) as unknown;
			} catch {
				body = text;
			}

			if (this.#isObject(body)) {
				const serverMessage = body.message ?? body.error;
				if (typeof serverMessage === "string" && serverMessage !== "")
					message = serverMessage;
			} else if (typeof body === "string") {
				message = body;
			}
		}

		return new CFetchSqlError(
			message,
			response.status,
			response.statusText,
			url,
			body
		);
	}

	#isObject(value: unknown): value is CSqlRow {
		return typeof value === "object" && value !== null
			&& !Array.isArray(value);
	}
}
