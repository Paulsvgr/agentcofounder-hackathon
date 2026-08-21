import type {
  HackathonRunData,
  HackathonRunRecord,
  HumanFields,
  RunExport,
} from "../types/runExport";

const API_BASE = (
  import.meta.env.VITE_HACKATHON_API_BASE || "https://admin.coretechs.se/hackathon"
).replace(/\/$/, "");

const KEY_STORAGE = "hackathon_access_key";

export function getStoredAccessKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setStoredAccessKey(key: string): void {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

export function buildRunData(exp: RunExport, human: HumanFields): HackathonRunData {
  return {
    git_branch: exp.meta.git_branch,
    git_commit: exp.meta.git_commit,
    approach_kind: exp.meta.approach,
    app_rating: human.app_rating,
    app_comment: human.app_comment,
    run_comment: human.run_comment,
    export: exp,
  };
}

async function request<T>(
  path: string,
  options: RequestInit & { accessKey?: string } = {},
): Promise<T> {
  const { accessKey, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extraHeaders as Record<string, string>),
  };
  if (rest.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (accessKey) {
    headers["X-Hackathon-Key"] = accessKey;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    throw new Error(formatApiError(body, res.status, text));
  }
  return body as T;
}

function formatApiError(body: unknown, status: number, fallback: string): string {
  if (typeof body === "object" && body) {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    if (Array.isArray(obj.detail)) return obj.detail.map(String).join(" ");
    if (typeof obj.message === "string") return obj.message;
    // DRF field errors: { person: ["…"], data: { … } }
    const parts: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (key === "detail" || key === "message") continue;
      if (typeof val === "string") parts.push(`${key}: ${val}`);
      else if (Array.isArray(val)) parts.push(`${key}: ${val.map(String).join(" ")}`);
      else if (val && typeof val === "object") {
        parts.push(`${key}: ${JSON.stringify(val)}`);
      }
    }
    if (parts.length) return parts.join(" · ");
  }
  return fallback || `HTTP ${status}`;
}

export async function fetchPeople(): Promise<string[]> {
  const data = await request<{ people: string[] }>("/api/v1/people/");
  return data.people;
}

export type ListRunsParams = {
  person?: string;
  branch?: string;
  commit?: string;
  approach_kind?: string;
};

export async function listRuns(params: ListRunsParams = {}): Promise<HackathonRunRecord[]> {
  const q = new URLSearchParams();
  if (params.person) q.set("person", params.person);
  if (params.branch) q.set("branch", params.branch);
  if (params.commit) q.set("commit", params.commit);
  if (params.approach_kind) q.set("approach_kind", params.approach_kind);
  const suffix = q.toString() ? `?${q}` : "";
  const body = await request<HackathonRunRecord[] | { results: HackathonRunRecord[] }>(
    `/api/v1/runs/${suffix}`,
  );
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray(body.results)) return body.results;
  return [];
}

export async function getRun(id: string): Promise<HackathonRunRecord> {
  return request<HackathonRunRecord>(`/api/v1/runs/${id}/`);
}

export async function createRun(input: {
  person: string;
  data: HackathonRunData;
  accessKey: string;
}): Promise<HackathonRunRecord> {
  return request<HackathonRunRecord>("/api/v1/runs/", {
    method: "POST",
    accessKey: input.accessKey,
    body: JSON.stringify({ person: input.person, data: input.data }),
  });
}
