import { GitHubCommit } from "@/components/last-updated-by/types";
import { CommitDetails } from "./types";

const CACHE_TTL = 3600; // 1 hour in seconds

export const EXCLUDED_COMMIT_SHAS: string[] = [
  "a0df7d521f64582b6772e63ed2f2c19b1cc43502",
  "0e139dff4c461233738c8b0539b5c2d23a302561",
  "1e94e24607fe4e98f28248cfd3b96af31779c336",
  "b1956b16237ec61c28477f0aa585a434e6a185ff",
];

export const EXCLUDED_AUTHORS: string[] = ["tina-cloud-app[bot]", "github-actions[bot]"];

// ---------------- API ----------------

export async function fetchGitHub<T>(url: string, headers: Record<string, string>): Promise<T> {
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

// ---------------- Path Migration Support ----------------

function constructOldPath(path: string): string | null {
  const match = path.match(/^public\/(?:uploads\/)?rules\/(.+)$/);
  if (!match) return null;

  const relativePath = match[1];

  if (relativePath.endsWith("/rule.mdx")) {
    const oldPath = relativePath.replace(/\.mdx$/, ".md");
    return `rules/${oldPath}`;
  }

  return null;
}

// ---------------- Fetch All Commits ----------------

export async function fetchAllCommitsForPath(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  headers: Record<string, string>
): Promise<GitHubCommit[]> {
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/commits`;
  const allCommits: GitHubCommit[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const params = new URLSearchParams({
      sha: branch,
      path,
      per_page: perPage.toString(),
      page: page.toString(),
    });

    try {
      const commits = await fetchGitHub<GitHubCommit[]>(`${baseUrl}?${params}`, headers);

      if (!commits || commits.length === 0) break;

      allCommits.push(...commits);

      if (commits.length < perPage) break;

      page++;
    } catch {
      break;
    }
  }

  return allCommits;
}

// ---------------- Rename Tracking ----------------

export async function findRenameHistory(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  headers: Record<string, string>,
  visitedPaths: Set<string> = new Set()
): Promise<{ commits: GitHubCommit[]; originalPath: string }> {
  if (visitedPaths.has(path)) {
    return { commits: [], originalPath: path };
  }
  visitedPaths.add(path);

  const commits = await fetchAllCommitsForPath(owner, repo, path, branch, headers);

  const oldPath = constructOldPath(path);
  if (oldPath) {
    const oldCommits = await fetchAllCommitsForPath(owner, repo, oldPath, branch, headers);

    const existingShas = new Set(commits.map((c) => c.sha));
    const additional = oldCommits.filter((c) => !existingShas.has(c.sha));

    return {
      commits: [...commits, ...additional],
      originalPath: oldPath,
    };
  }

  if (commits.length === 0) {
    return { commits: [], originalPath: path };
  }

  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i];
    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`;

    try {
      const commitDetails = await fetchGitHub<CommitDetails>(commitUrl, headers);

      const renamedFile = commitDetails.files?.find((file) => file.status === "renamed" && file.filename === path && file.previous_filename);

      if (renamedFile?.previous_filename) {
        const oldHistory = await findRenameHistory(owner, repo, renamedFile.previous_filename, branch, headers, visitedPaths);

        const existingShas = new Set(commits.map((c) => c.sha));
        const additional = oldHistory.commits.filter((c) => !existingShas.has(c.sha));

        return {
          commits: [...commits, ...additional],
          originalPath: oldHistory.originalPath,
        };
      }
    } catch {
      continue;
    }
  }

  return { commits, originalPath: path };
}

// ---------------- Co-author Parsing ----------------

interface ExtractedCoAuthor {
  name: string;
  email: string;
}

export function extractCoAuthors(message: string): ExtractedCoAuthor[] {
  const regex = /co-authored-by:\s*(.+?)\s*<([^>]+)>/gi;
  const coAuthors: ExtractedCoAuthor[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(message))) {
    coAuthors.push({
      name: match[1].trim(),
      email: match[2].trim(),
    });
  }

  return coAuthors;
}

function normalizeIdentifier(identifier?: string | null): string | null {
  if (!identifier) return null;
  return identifier.trim().toLowerCase();
}

function isIdentifierExcluded(identifier?: string | null): boolean {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return false;

  return EXCLUDED_AUTHORS.some((excluded) => normalizeIdentifier(excluded) === normalized);
}

function isPrimaryAuthorExcluded(commit: GitHubCommit): boolean {
  return isIdentifierExcluded(commit.author?.login) || isIdentifierExcluded(commit.commit.author.name) || isIdentifierExcluded(commit.commit.author.email);
}

function findFirstAllowedCoAuthorName(commit: GitHubCommit): string | null {
  const coAuthors = extractCoAuthors(commit.commit.message);

  for (const coAuthor of coAuthors) {
    if (!isIdentifierExcluded(coAuthor.name) && !isIdentifierExcluded(coAuthor.email)) {
      return coAuthor.name;
    }
  }

  return null;
}

export function getAlternateAuthorName(commit: GitHubCommit | null): string | null {
  if (!commit) {
    return null;
  }

  if (!isPrimaryAuthorExcluded(commit)) {
    return null;
  }

  return findFirstAllowedCoAuthorName(commit);
}

// ---------------- Exclusion Logic With Co-authors ----------------

export function isCommitExcluded(commit: GitHubCommit): boolean {
  if (EXCLUDED_COMMIT_SHAS.includes(commit.sha)) {
    return true;
  }

  if (!isPrimaryAuthorExcluded(commit)) {
    return false;
  }

  // If any allowed co-author exists, do not exclude the commit
  const alternateAuthorName = findFirstAllowedCoAuthorName(commit);
  return !alternateAuthorName;
}

// ---------------- Find Latest Valid Commit ----------------

export function findLatestNonExcludedCommit(commits: GitHubCommit[]): GitHubCommit | null {
  if (commits.length === 0) {
    return null;
  }

  for (const commit of commits) {
    if (!isCommitExcluded(commit)) {
      return commit;
    }
  }

  return commits[0];
}
