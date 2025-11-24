import { NextResponse } from "next/server";
import type { GitHubCommit } from "../../../components/last-updated-by/types";

const CACHE_TTL = 60; // 1 minute in seconds
export const revalidate = CACHE_TTL;

const GITHUB_ACTIVE_BRANCH = "tina-migration-main-content-v2";

async function fetchGitHub<T>(url: string, headers: Record<string, string>): Promise<T> {
  console.log("🚀 ~ fetchGitHub ~ url:", url);
  const response = await fetch(url, {
    headers,
    next: { revalidate: CACHE_TTL },
  });

  if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
    throw new Error("GitHub API rate limit exceeded");
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path")?.replace(/\\/g, "/");

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo parameters" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Rules.V3",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_API_PAT}`,
  };

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/commits`;
  const params = new URLSearchParams({
    sha: GITHUB_ACTIVE_BRANCH,
    per_page: "1",
  });
  if (path) {
    params.append("path", path);
  }

  try {
    const [latestCommits, allCommits] = await Promise.all([
      fetchGitHub<GitHubCommit[]>(`${baseUrl}?${params}`, headers),
      path ? fetchGitHub<GitHubCommit[]>(`${baseUrl}?sha=${GITHUB_ACTIVE_BRANCH}&path=${path}&per_page=100`, headers).catch(() => []) : Promise.resolve([]),
    ]);

    console.log("latestCommits", latestCommits);
    console.log("allCommits", allCommits);

    if (!latestCommits.length) {
      return NextResponse.json({ error: "No commits found" }, { status: 400 });
    }

    const latestCommit = latestCommits[0];
    const firstCommit = allCommits.length ? allCommits.at(-1)! : null;

    return NextResponse.json({
      latestCommit,
      firstCommit,
      historyUrl: path
        ? `https://github.com/${owner}/${repo}/commits/${GITHUB_ACTIVE_BRANCH}/${path}`
        : `https://github.com/${owner}/${repo}/commits/${GITHUB_ACTIVE_BRANCH}`,
    });
  } catch (error) {
    console.error("Error fetching GitHub metadata:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub metadata" }, { status: 500 });
  }
}
