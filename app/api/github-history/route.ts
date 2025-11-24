import { NextResponse } from "next/server";
import type { GitHubCommit } from "@/components/last-updated-by/types";
import { fetchGitHub, findLatestNonExcludedCommit, findRenameHistory } from "./util";

export const CACHE_TTL = 3600; // 1 hour in seconds

const GITHUB_ACTIVE_BRANCH = process.env.NEXT_PUBLIC_TINA_BRANCH || "main";

// Commits to exclude from being shown as the latestCommit
// These commits will be skipped, and the next non-excluded commit will be shown instead
//TODO: after going live, hide the commits that were part of the migration.
export const EXCLUDED_COMMIT_SHAS: string[] = [
  // Add commit SHAs here that should be skipped
  // Example: "abc123def456...",
];

// Authors to exclude from being shown as the latestCommit
// Commits by these authors (by GitHub login, name, or email) will be skipped
//TODO: Add the tinaBot author to the excluded authors.
export const EXCLUDED_AUTHORS: string[] = [
  // Add author identifiers here (GitHub login, name, or email)
  // Example: "github-actions[bot]", "John Doe", "john@example.com",
];

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
    if (path) {
      // Fetch complete history including renames
      const { commits: allCommitsWithHistory } = await findRenameHistory(owner, repo, path, GITHUB_ACTIVE_BRANCH, headers);

      if (!allCommitsWithHistory.length) {
        return NextResponse.json({ error: "No commits found" }, { status: 400 });
      }

      const latestCommit = findLatestNonExcludedCommit(allCommitsWithHistory);
      const firstCommit = allCommitsWithHistory[allCommitsWithHistory.length - 1];

      if (!latestCommit) {
        return NextResponse.json({ error: "No valid commits found" }, { status: 400 });
      }

      return NextResponse.json({
        latestCommit,
        firstCommit,
        historyUrl: `https://github.com/${owner}/${repo}/commits/${GITHUB_ACTIVE_BRANCH}/${path}`,
      });
    } else {
      // No path specified, just get latest commit for the branch
      const latestCommits = await fetchGitHub<GitHubCommit[]>(`${baseUrl}?${params}`, headers);

      if (!latestCommits.length) {
        return NextResponse.json({ error: "No commits found" }, { status: 400 });
      }

      const latestCommit = findLatestNonExcludedCommit(latestCommits);

      if (!latestCommit) {
        return NextResponse.json({ error: "No valid commits found" }, { status: 400 });
      }

      return NextResponse.json({
        latestCommit,
        firstCommit: null,
        historyUrl: `https://github.com/${owner}/${repo}/commits/${GITHUB_ACTIVE_BRANCH}`,
      });
    }
  } catch (error) {
    console.error("Error fetching GitHub metadata:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub metadata" }, { status: 500 });
  }
}
