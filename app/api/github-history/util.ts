import { GitHubCommit } from "@/components/last-updated-by/types";
import { CommitDetails } from "./types";

const CACHE_TTL = 3600; // 1 hour in seconds

// Commits to exclude from being shown as the latestCommit
// These commits will be skipped, and the next non-excluded commit will be shown instead
//TODO: after going live, hide the commits that were part of the migration.
export const EXCLUDED_COMMIT_SHAS: string[] = [
  // Add commit SHAs here that should be skipped
  // Example: "abc123def456...",
  "a0df7d521f64582b6772e63ed2f2c19b1cc43502",
  "0e139dff4c461233738c8b0539b5c2d23a302561",
  "1e94e24607fe4e98f28248cfd3b96af31779c336",
  "b1956b16237ec61c28477f0aa585a434e6a185ff",
];

// Authors to exclude from being shown as the latestCommit
// Commits by these authors (by GitHub login, name, or email) will be skipped
//TODO: Add the tinaBot author to the excluded authors.
export const EXCLUDED_AUTHORS: string[] = [
  "tina-cloud-app",
  "github-actions[bot]",
  // Add author identifiers here (GitHub login, name, or email)
  // Example: "github-actions[bot]", "John Doe", "john@example.com",
];

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

/**
 * Constructs the old path for files that were migrated from rules/ to public/uploads/rules/
 * @param path Current path (e.g., "public/uploads/rules/rule-name/rule.mdx")
 * @returns Old path (e.g., "rules/rule-name/rule.md") or null if path doesn't match the pattern
 */
function constructOldPath(path: string): string | null {
  // Check if path starts with public/uploads/rules/ or public/rules/
  const publicRulesMatch = path.match(/^public\/(?:uploads\/)?rules\/(.+)$/);
  if (!publicRulesMatch) {
    return null;
  }

  // Extract the relative path after public/uploads/rules/ or public/rules/
  const relativePath = publicRulesMatch[1];

  // Handle paths like "rule-name/rule.mdx" -> "rules/rule-name/rule.md"
  if (relativePath.endsWith("/rule.mdx")) {
    // Replace .mdx extension with .md and prepend "rules/"
    const oldPath = relativePath.replace(/\.mdx$/, ".md");
    return `rules/${oldPath}`;
  }

  // If it doesn't end with /rule.mdx, return null (not a rule file)
  return null;
}

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
      path: path,
      per_page: perPage.toString(),
      page: page.toString(),
    });

    try {
      const commits = await fetchGitHub<GitHubCommit[]>(`${baseUrl}?${params}`, headers);

      if (!commits || commits.length === 0) {
        break;
      }

      allCommits.push(...commits);

      // If we got fewer than perPage results, we've reached the end
      if (commits.length < perPage) {
        break;
      }

      page++;
    } catch (error) {
      // If we get an error (like 404), stop fetching
      break;
    }
  }

  return allCommits;
}

export async function findRenameHistory(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  headers: Record<string, string>,
  visitedPaths: Set<string> = new Set()
): Promise<{ commits: GitHubCommit[]; originalPath: string }> {
  // Avoid infinite loops
  if (visitedPaths.has(path)) {
    return { commits: [], originalPath: path };
  }
  visitedPaths.add(path);

  // Fetch all commits for current path
  const commits = await fetchAllCommitsForPath(owner, repo, path, branch, headers);

  // If path starts with public/rules/..., manually construct old path and fetch its history
  const oldPath = constructOldPath(path);
  if (oldPath) {
    // Fetch history of the old path
    const oldPathCommits = await fetchAllCommitsForPath(owner, repo, oldPath, branch, headers);

    // Merge commits: current path commits + old path history (avoid duplicates by SHA)
    // Both arrays are in newest-first order, so we append old commits after current commits
    const existingShas = new Set(commits.map((c) => c.sha));
    const additionalCommits = oldPathCommits.filter((c) => !existingShas.has(c.sha));

    // Combine: current commits (newest first) + old commits (newest first)
    // This maintains newest-first order: [newest current, ..., oldest current, newest old, ..., oldest old]
    return {
      commits: [...commits, ...additionalCommits],
      originalPath: oldPath,
    };
  }

  if (commits.length === 0) {
    return { commits: [], originalPath: path };
  }

  // Check commits from oldest to newest to find renames
  // We go backwards because we want to find the earliest rename
  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i];

    try {
      // Get full commit details to check for file renames
      const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`;
      const commitDetails = await fetchGitHub<CommitDetails>(commitUrl, headers);

      // Check if this commit contains a rename for our file
      const renamedFile = commitDetails.files?.find((file) => file.status === "renamed" && file.filename === path && file.previous_filename);

      if (renamedFile && renamedFile.previous_filename) {
        // File was renamed, fetch history of the old path
        const oldPathHistory = await findRenameHistory(owner, repo, renamedFile.previous_filename, branch, headers, visitedPaths);

        // Merge commits: current path commits + old path history (avoid duplicates by SHA)
        // Both arrays are in newest-first order, so we append old commits after current commits
        const existingShas = new Set(commits.map((c) => c.sha));
        const additionalCommits = oldPathHistory.commits.filter((c) => !existingShas.has(c.sha));

        // Combine: current commits (newest first) + old commits (newest first)
        // This maintains newest-first order: [newest current, ..., oldest current, newest old, ..., oldest old]
        return {
          commits: [...commits, ...additionalCommits],
          originalPath: oldPathHistory.originalPath,
        };
      }
    } catch (error) {
      // If we can't fetch commit details, continue to next commit
      console.warn(`Could not fetch commit details for ${commit.sha}:`, error);
    }
  }

  // No renames found, return the commits we have
  return { commits, originalPath: path };
}

/**
 * Checks if a commit should be excluded based on SHA or author
 * @param commit The commit to check
 * @returns true if the commit should be excluded
 */
export function isCommitExcluded(commit: GitHubCommit): boolean {
  // Check if commit SHA is excluded
  if (EXCLUDED_COMMIT_SHAS.includes(commit.sha)) {
    return true;
  }

  // Check if author is excluded (by login, name, or email)
  const authorLogin = commit.author?.login?.toLowerCase();
  const authorName = commit.commit.author.name?.toLowerCase();
  const authorEmail = commit.commit.author.email?.toLowerCase();

  for (const excludedAuthor of EXCLUDED_AUTHORS) {
    const excludedLower = excludedAuthor.toLowerCase();
    if (authorLogin === excludedLower || authorName === excludedLower || authorEmail === excludedLower) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the first commit that is not in the exclusion list
 * @param commits Array of commits (newest first)
 * @returns The first non-excluded commit, or the first commit if all are excluded
 */
export function findLatestNonExcludedCommit(commits: GitHubCommit[]): GitHubCommit | null {
  if (commits.length === 0) {
    return null;
  }

  // Find the first commit that is not excluded
  for (const commit of commits) {
    if (!isCommitExcluded(commit)) {
      return commit;
    }
  }

  // If all commits are excluded, return the first one anyway
  return commits[0];
}
