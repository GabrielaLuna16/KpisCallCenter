import { Octokit } from '@octokit/rest';

function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

const OWNER = () => process.env.GITHUB_OWNER!;
const REPO = () => process.env.GITHUB_REPO!;

export async function getFileSha(path: string): Promise<string | null> {
  const octokit = getOctokit();
  try {
    const res = await octokit.repos.getContent({ owner: OWNER(), repo: REPO(), path });
    const data = res.data as { sha: string };
    return data.sha;
  } catch {
    return null;
  }
}

export async function readFileContent(path: string): Promise<string | null> {
  const octokit = getOctokit();
  try {
    const res = await octokit.repos.getContent({ owner: OWNER(), repo: REPO(), path });
    const data = res.data as { content: string; encoding: string };
    if (data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

export async function commitFile(path: string, content: string, message: string): Promise<void> {
  const octokit = getOctokit();
  const sha = await getFileSha(path);
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER(),
    repo: REPO(),
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha ? { sha } : {}),
  });
}
