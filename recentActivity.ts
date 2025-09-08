import * as fs from "fs";

const GH_USERNAME = "ytoshiki";
const TARGET_FILE = "README.md";
const MAX_LINES = 10;

interface GitHubPullRequest {
  url: string;
  html_url: string;
  merged_at: string | null;
  [key: string]: any;
}

interface GitHubIssue {
  repository_url: string;
  number: number;
  updated_at: string;
  pull_request?: GitHubPullRequest;
  [key: string]: any;
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

interface ActivityItem {
  type: "pr" | "issue";
  number: number;
  repoName: string;
  updated_at: string;
}

(async () => {
  try {
    const [mergedPRsResponse, issuesResponse] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=is:pr+author:${GH_USERNAME}+is:merged&sort=updated&order=desc`
      ),
      fetch(
        `https://api.github.com/search/issues?q=is:issue+author:${GH_USERNAME}&sort=updated&order=desc`
      ),
    ]);

    const [mergedPRs, issues] = await Promise.all([
      mergedPRsResponse.json() as Promise<GitHubSearchResponse>,
      issuesResponse.json() as Promise<GitHubSearchResponse>,
    ]);

    const filteredPRs: GitHubIssue[] = mergedPRs.items.filter(
      (pr) => !pr.repository_url.includes(GH_USERNAME)
    );
    const filteredIssues: GitHubIssue[] = issues.items.filter(
      (issue) => !issue.repository_url.includes(GH_USERNAME)
    );

    const allActivities: ActivityItem[] = [
      ...filteredPRs.map(
        (pr: GitHubIssue): ActivityItem => ({
          type: "pr",
          number: pr.number,
          repoName: pr.repository_url.split("/repos/")[1],
          updated_at: pr.updated_at,
        })
      ),
      ...filteredIssues.map(
        (issue: GitHubIssue): ActivityItem => ({
          type: "issue",
          number: issue.number,
          repoName: issue.repository_url.split("/repos/")[1],
          updated_at: issue.updated_at,
        })
      ),
    ].sort(
      (a: ActivityItem, b: ActivityItem) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    const recentActivities: ActivityItem[] = allActivities.slice(0, MAX_LINES);

    await updateReadme(recentActivities);
  } catch (_err) {}
})();

async function updateReadme(activities: ActivityItem[]): Promise<void> {
  try {
    const readmeContent = fs
      .readFileSync(`./${TARGET_FILE}`, "utf-8")
      .split("\n");

    let startIdx = readmeContent.findIndex(
      (content) => content.trim() === "<!--START_SECTION:activity-->"
    );

    if (startIdx === -1) {
      return;
    }

    const endIdx = readmeContent.findIndex(
      (content) => content.trim() === "<!--END_SECTION:activity-->"
    );

    if (activities.length === 0) {
      return;
    }

    const content: string[] = activities.map(
      (activity: ActivityItem, idx: number): string => {
        if (activity.type === "pr") {
          return `${idx + 1}. 🎉 Merged PR [#${
            activity.number
          }](https://github.com/${activity.repoName}/pull/${
            activity.number
          }) in [${activity.repoName}](https://github.com/${
            activity.repoName
          })`;
        } else {
          return `${idx + 1}. 📝 Issue [#${
            activity.number
          }](https://github.com/${activity.repoName}/issues/${
            activity.number
          }) in [${activity.repoName}](https://github.com/${
            activity.repoName
          })`;
        }
      }
    );

    if (endIdx === -1) {
      startIdx++;
      content.forEach((line: string, idx: number) =>
        readmeContent.splice(startIdx + idx, 0, line)
      );
      readmeContent.splice(
        startIdx + content.length,
        0,
        "<!--END_SECTION:activity-->"
      );
    } else {
      const oldContent = readmeContent.slice(startIdx + 1, endIdx).join("\n");
      const newContent = content.join("\n");

      if (oldContent.trim() === newContent.trim()) {
        return;
      }

      startIdx++;

      readmeContent.splice(startIdx, endIdx - startIdx);

      content.forEach((line: string, idx: number) => {
        readmeContent.splice(startIdx + idx, 0, line);
      });
    }

    fs.writeFileSync(`./${TARGET_FILE}`, readmeContent.join("\n"));
  } catch (_err) {}
}
