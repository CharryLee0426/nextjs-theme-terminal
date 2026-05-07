#!/usr/bin/env bash
# Run Jest against tests related to PR diff, or full suite when tooling/config changes.
set -eo pipefail

BASE_SHA="${BASE_SHA:?}"
HEAD_SHA="${HEAD_SHA:?}"

write_ran() {
  local v="$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      echo "ran=$v"
    } >>"$GITHUB_OUTPUT"
  fi
}

RAW=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && continue
  RAW+=("$line")
done < <(git diff --name-only "$BASE_SHA" "$HEAD_SHA" -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' || true)

full_suite=false
for f in "${RAW[@]}"; do
  case "$f" in
    jest.config.js|jest.setup.ts|jest.env.js|jest.markdownReporter.cjs|package.json|package-lock.json|tsconfig.json|next.config.ts|next.config.js|next.config.mjs)
      full_suite=true
      break
      ;;
  esac
done

if [[ "$full_suite" == true ]]; then
  echo "Running full Jest suite (config, Next config, or lockfile changed)."
  write_ran true
  npm test
  exit 0
fi

related=()
for f in "${RAW[@]}"; do
  case "$f" in
    src/*|tests/*) ;;
    *) continue ;;
  esac
  if [[ -f "$f" ]]; then
    related+=("$f")
  fi
done

if [[ ${#related[@]} -eq 0 ]]; then
  echo "No changed source or test files under src/ or tests/; skipping Jest."
  write_ran false
  exit 0
fi

echo "Running Jest --findRelatedTests for: ${related[*]}"
write_ran true
exec npx jest --findRelatedTests --coverage --passWithNoTests "${related[@]}"
