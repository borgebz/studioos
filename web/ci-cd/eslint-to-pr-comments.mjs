#!/usr/bin/env node
/**
 * Posts ESLint results as inline PR comments via Azure DevOps API.
 * Run only in PR builds. Requires SYSTEM_ACCESSTOKEN and System.PullRequest.PullRequestId.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const collectionUri = process.env.SYSTEM_COLLECTIONURI;
const project = process.env.SYSTEM_TEAMPROJECT;
const repoName = process.env.BUILD_REPOSITORY_NAME;
const prId = process.env.SYSTEM_PULLREQUEST_PULLREQUESTID;
const accessToken = process.env.SYSTEM_ACCESSTOKEN;
const sourcesDir = process.env.BUILD_SOURCESDIRECTORY || process.cwd();

if (!prId || !accessToken) {
  console.log('Not a PR build or missing token - skipping PR comments');
  process.exit(0);
}

const eslintResultsPath = resolve(__dirname, '../client/eslint-results.json');
let results;
try {
  results = JSON.parse(readFileSync(eslintResultsPath, 'utf8'));
} catch (err) {
  console.log('No ESLint results found or invalid JSON:', err.message);
  process.exit(0);
}

if (!Array.isArray(results) || results.length === 0) {
  process.exit(0);
}

const baseUrl = `${collectionUri}${project}/_apis/git/repositories/${repoName}/pullRequests/${prId}/threads`;
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
};

function toRepoPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith(sourcesDir)) {
    return normalized.slice(sourcesDir.length).replace(/^\//, '');
  }
  if (normalized.startsWith('/')) {
    return normalized.replace(/^\//, '');
  }
  return `client/${normalized.replace(/^\.\//, '')}`;
}

async function main() {
let posted = 0;
for (const file of results) {
  if (!file.messages?.length) continue;
  const repoFilePath = '/' + toRepoPath(file.filePath);

  for (const msg of file.messages) {
    if (msg.severity !== 2) continue; // only errors
    const line = msg.line || 1;
    const body = {
      comments: [{
        parentCommentId: 0,
        content: `**ESLint (${msg.ruleId || 'error'})**: ${msg.message}`,
        commentType: 1,
      }],
      status: 1,
      threadContext: {
        filePath: repoFilePath,
        rightFileStart: { line, offset: 1 },
        rightFileEnd: { line, offset: 1 },
      },
    };
    try {
      const res = await fetch(`${baseUrl}?api-version=7.1-preview.1`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) posted++;
      else console.warn(`Failed to post comment (${res.status}):`, await res.text());
    } catch (err) {
      console.warn('API error:', err.message);
    }
  }
}
console.log(`Posted ${posted} ESLint comment(s) to the PR.`);
}
main().catch(err => { console.error(err); process.exit(1); });
