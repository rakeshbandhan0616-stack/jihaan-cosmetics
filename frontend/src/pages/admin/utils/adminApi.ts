const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/$/, "");

export function getAdminToken(): string {
  return localStorage.getItem("adminToken") || "";
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = getAdminToken();

  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  let requestBody: BodyInit | undefined;

  if (isFormData) {
    /*
     * FormData must not be converted to JSON.
     * The browser automatically sets the correct
     * multipart/form-data boundary.
     */
    headers.delete("Content-Type");

    requestBody = options.body as FormData;
  } else if (
    options.body === undefined ||
    options.body === null
  ) {
    requestBody = undefined;
  } else if (typeof options.body === "string") {
    requestBody = options.body;
  } else {
    headers.set("Content-Type", "application/json");

    requestBody = JSON.stringify(options.body);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
      body: requestBody,
    },
  );

  const contentType =
    response.headers.get("content-type") || "";

  const responseText = await response.text();

  let data: unknown = null;

  if (responseText.trim()) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "The server returned invalid JSON.",
        );
      }
    } else {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(
            (data as { message?: unknown }).message ||
              "Something went wrong",
          )
        : typeof data === "string" && data.trim()
          ? data
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export function getEntityId(item: any): string {
  return String(item?._id || item?.id || "");
}

export function getArray<T>(
  response: any,
  keys: string[] = [],
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}