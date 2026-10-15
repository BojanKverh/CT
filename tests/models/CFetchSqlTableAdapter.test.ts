import { describe, expect, test, vi } from "vitest";

import {
	CFetchSqlError,
	CFetchSqlTableAdapter,
	type CSqlFetch
} from "../../src/models/CFetchSqlTableAdapter.js";
import { CSortOrder } from "../../src/gui/CSortOrder.js";
import { CSqlFilterOperator } from "../../src/models/CSqlFilter.js";

function jsonResponse(value: unknown, status = 200): Response {
	return new Response(JSON.stringify(value), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

describe("CFetchSqlTableAdapter", () => {
	test("select sends pagination and column parameters", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({
			rows: [{ id: 2, name: "Bob" }],
			totalRowCount: 12
		}));
		const adapter = new CFetchSqlTableAdapter("/api/", {
			fetch: fetchMock
		});

		const result = await adapter.select({
			table: "employees",
			columns: ["id", "name"],
			offset: 5,
			limit: 10
		});

		expect(result).toEqual({
			rows: [{ id: 2, name: "Bob" }],
			totalRowCount: 12
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe("/api/employees?offset=5&limit=10&columns=id%2Cname");
		expect(init?.method).toBe("GET");
		expect(new Headers(init?.headers).get("Accept")).toBe("application/json");
	});

	test("select omits the columns parameter when all columns are requested", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({
			rows: [],
			totalRowCount: 0
		}));
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		await adapter.select({
			table: "people archive",
			columns: [],
			offset: 0,
			limit: 20
		});

		expect(fetchMock.mock.calls[0]?.[0])
			.toBe("/api/people%20archive?offset=0&limit=20");
	});

	test("insert posts JSON and returns the inserted row", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({
			id: 3,
			name: "Carol"
		}));
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		const row = await adapter.insert("employees", { name: "Carol" });

		expect(row).toEqual({ id: 3, name: "Carol" });
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe("/api/employees");
		expect(init?.method).toBe("POST");
		expect(init?.body).toBe('{"name":"Carol"}');
		expect(new Headers(init?.headers).get("Content-Type"))
			.toBe("application/json");
	});

	test("update patches the encoded record URL", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => new Response(null, { status: 204 }));
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		await adapter.update("employees", "employee_id", "A/10", {
			name: "Alicia"
		});

		expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/employees/A%2F10");
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
		expect(fetchMock.mock.calls[0]?.[1]?.body)
			.toBe('{"name":"Alicia"}');
	});

	test("remove deletes the encoded record URL", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => new Response(null, { status: 204 }));
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		await adapter.remove("employees", "id", 42);

		expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/employees/42");
		expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("DELETE");
		expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
	});

	test("adds dynamic headers, credentials and an abort signal", async () => {
		const controller = new AbortController();
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({
			rows: [],
			totalRowCount: 0
		}));
		const headers = vi.fn(() => ({ Authorization: "Bearer token" }));
		const adapter = new CFetchSqlTableAdapter("/api", {
			fetch: fetchMock,
			headers,
			signal: () => controller.signal,
			credentials: "include"
		});

		await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 10
		});

		const init = fetchMock.mock.calls[0]?.[1];
		expect(headers).toHaveBeenCalledOnce();
		expect(new Headers(init?.headers).get("Authorization"))
			.toBe("Bearer token");
		expect(init?.signal).toBe(controller.signal);
		expect(init?.credentials).toBe("include");
	});

	test("setBaseUrl changes subsequent request URLs", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({
			rows: [],
			totalRowCount: 0
		}));
		const adapter = new CFetchSqlTableAdapter("/old", { fetch: fetchMock });
		adapter.setBaseUrl("https://example.test/v2/");

		await adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 1
		});

		expect(adapter.baseUrl()).toBe("https://example.test/v2");
		expect(fetchMock.mock.calls[0]?.[0])
			.toBe("https://example.test/v2/employees?offset=0&limit=1");
	});

	test("exposes JSON server errors as CFetchSqlError", async () => {
		const fetchMock: CSqlFetch = async () => new Response(JSON.stringify({
			message: "Employee is locked",
			code: "LOCKED"
		}), {
			status: 409,
			statusText: "Conflict"
		});
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		const operation = adapter.remove("employees", "id", 3);

		await expect(operation).rejects.toMatchObject({
			name: "CFetchSqlError",
			message: "Employee is locked",
			status: 409,
			statusText: "Conflict",
			url: "/api/employees/3",
			body: { message: "Employee is locked", code: "LOCKED" }
		});
		await expect(operation).rejects.toBeInstanceOf(CFetchSqlError);
	});

	test("uses a plain-text server error as its message", async () => {
		const adapter = new CFetchSqlTableAdapter("/api", {
			fetch: async () => new Response("Database unavailable", {
				status: 503,
				statusText: "Service Unavailable"
			})
		});

		await expect(adapter.remove("employees", "id", 3))
			.rejects.toThrow("Database unavailable");
	});

	test("rejects malformed select responses", async () => {
		const adapter = new CFetchSqlTableAdapter("/api", {
			fetch: async () => jsonResponse({ rows: "not an array" })
		});

		await expect(adapter.select({
			table: "employees",
			columns: [],
			offset: 0,
			limit: 10
		})).rejects.toThrow("Invalid select response");
	});

	test("rejects invalid JSON returned by a successful request", async () => {
		const adapter = new CFetchSqlTableAdapter("/api", {
			fetch: async () => new Response("not JSON")
		});

		await expect(adapter.insert("employees", { name: "Alice" }))
			.rejects.toThrow("Invalid JSON response");
	});

	test("does not replace explicitly configured content headers", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({ id: 1 }));
		const adapter = new CFetchSqlTableAdapter("/api", {
			fetch: fetchMock,
			headers: {
				Accept: "application/vnd.example+json",
				"Content-Type": "application/merge-patch+json"
			}
		});

		await adapter.insert("employees", { name: "Alice" });

		const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
		expect(headers.get("Accept")).toBe("application/vnd.example+json");
		expect(headers.get("Content-Type"))
			.toBe("application/merge-patch+json");
	});

	test("serializes server-side sorting and filters", async () => {
		const fetchMock = vi.fn(async (
			_input: RequestInfo | URL,
			_init?: RequestInit
		) => jsonResponse({ rows: [], totalRowCount: 0 }));
		const adapter = new CFetchSqlTableAdapter("/api", { fetch: fetchMock });

		await adapter.select({
			table: "employees",
			columns: ["id", "name"],
			offset: 0,
			limit: 20,
			sortColumn: "name",
			sortOrder: CSortOrder.DescendingOrder,
			filters: [{
				column: "country",
				operator: CSqlFilterOperator.Equal,
				value: "Slovenia"
			}]
		});

		const url = String(fetchMock.mock.calls[0]?.[0]);
		const query = new URLSearchParams(url.slice(url.indexOf("?") + 1));
		expect(query.get("sort")).toBe("name");
		expect(query.get("order")).toBe("desc");
		expect(JSON.parse(query.get("filters")!)).toEqual([{
			column: "country",
			operator: "eq",
			value: "Slovenia"
		}]);
	});
});
