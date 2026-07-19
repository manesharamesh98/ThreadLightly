#!/usr/bin/env node
// PostToolUse hook (Write|Edit): nudges Claude to run the fullstack-code-reviewer
// agent after source code changes. Hooks can't invoke subagents directly, so this
// injects additionalContext instructing the model to do so.

const EXCLUDED_PATH_PARTS = [
  '/node_modules/',
  '/.git/',
  '/Context/',
  '/.claude/',
  '/uploads/',
  '/sample-labels/',
  '/memory/',
];

const REVIEWABLE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.html', '.css', '.sql'];

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let filePath;
  try {
    const payload = JSON.parse(input);
    filePath = payload?.tool_input?.file_path;
  } catch {
    process.exit(0);
  }

  if (!filePath || filePath.endsWith('threadlightly.db')) process.exit(0);
  if (EXCLUDED_PATH_PARTS.some((part) => filePath.includes(part))) process.exit(0);
  if (!REVIEWABLE_EXTENSIONS.some((ext) => filePath.endsWith(ext))) process.exit(0);

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `The file ${filePath} was just written or modified. Before considering this task complete, invoke the fullstack-code-reviewer agent (Agent tool, subagent_type: "fullstack-code-reviewer") to review this change for performance, code quality, scalability, and infrastructure issues. Present its plain-language findings and wait for user confirmation before implementing any of its suggested fixes.`,
    },
  };
  process.stdout.write(JSON.stringify(output));
});
