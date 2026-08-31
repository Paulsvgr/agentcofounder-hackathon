import type {
  HackathonRunData,
  HackathonRunRecord,
  HumanFields,
  PasteOverrides,
  RunClassification,
  RunExport,
} from "../types/runExport";
import type { AppRubricScores } from "./app-rubric";

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
    app_rubric: human.app_rubric,
    app_rating: human.app_rating,
    app_comment: human.app_comment,
    run_comment: human.run_comment,
    human: {
      app_rubric: human.app_rubric,
      app_rating: human.app_rating,
      app_comment: human.app_comment,
      run_comment: human.run_comment,
    },
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

export type TaxonomyResponse = {
  taxonomy: { line: string[]; experiment: string[] };
  experiments: Array<{ slug: string; title: string }>;
};

export async function fetchTaxonomy(): Promise<TaxonomyResponse> {
  return request<TaxonomyResponse>("/api/v1/taxonomy/");
}

export async function createExperiment(input: {
  id: string;
  title?: string;
  accessKey: string;
}): Promise<TaxonomyResponse & { experiment: { slug: string; title: string } }> {
  return request("/api/v1/experiments/", {
    method: "POST",
    accessKey: input.accessKey,
    body: JSON.stringify({ id: input.id, title: input.title || "" }),
  });
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

export async function updateRun(input: {
  id: string;
  person?: string;
  data: HackathonRunData;
  accessKey: string;
}): Promise<HackathonRunRecord> {
  const body: { person?: string; data: HackathonRunData } = { data: input.data };
  if (input.person) body.person = input.person;
  return request<HackathonRunRecord>(`/api/v1/runs/${input.id}/`, {
    method: "PATCH",
    accessKey: input.accessKey,
    body: JSON.stringify(body),
  });
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

/** Preferred create: server detects + normalizes paste to run_export.v1. */
export async function createRunFromPaste(input: {
  author: string;
  paste: unknown;
  overrides?: PasteOverrides;
  classification?: RunClassification;
  app_rubric?: AppRubricScores | null;
  app_rating?: number | null;
  app_comment?: string;
  run_comment?: string;
  accessKey: string;
}): Promise<HackathonRunRecord> {
  return request<HackathonRunRecord>("/api/v1/runs/", {
    method: "POST",
    accessKey: input.accessKey,
    body: JSON.stringify({
      author: input.author,
      paste: input.paste,
      overrides: input.overrides || {},
      classification: input.classification,
      app_rubric: input.app_rubric ?? null,
      app_rating: input.app_rating ?? null,
      app_comment: input.app_comment || "",
      run_comment: input.run_comment || "",
    }),
  });
}
