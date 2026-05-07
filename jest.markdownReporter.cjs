const fs = require('fs')
const path = require('path')

function pctCell(metric) {
  if (!metric || typeof metric.pct !== 'number') return '—'
  const n = metric.pct
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function buildCoverageMarkdownSection() {
  const summaryPath = path.join(
    process.cwd(),
    'test_reports',
    'coverage',
    'coverage-summary.json',
  )
  if (!fs.existsSync(summaryPath)) {
    return [
      '',
      '## Coverage (`src/**`)',
      '',
      '*No `coverage-summary.json` found; coverage may be disabled.*',
      '',
    ]
  }

  let raw
  try {
    raw = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  } catch {
    return [
      '',
      '## Coverage (`src/**`)',
      '',
      '*Could not parse coverage summary.*',
      '',
    ]
  }

  const lines = []
  lines.push('')
  lines.push('## Coverage (`src/**`)')
  lines.push('')
  lines.push(
    'Istanbul output directory: `test_reports/coverage/` — open `index.html` for HTML, or use `lcov.info` / `coverage-summary.json`.',
  )
  lines.push('')

  const total = raw.total
  if (total) {
    lines.push('### Totals')
    lines.push('')
    lines.push('| Metric | Covered | Total | % |')
    lines.push('|--------|---------|-------|---|')
    for (const key of ['lines', 'statements', 'functions', 'branches']) {
      const m = total[key]
      if (m && typeof m.total === 'number') {
        lines.push(
          `| ${key} | ${m.covered} | ${m.total} | ${pctCell(m)} |`,
        )
      }
    }
    lines.push('')
  }

  lines.push('### Per-file')
  lines.push('')
  lines.push(
    '| File | Lines % | Statements % | Functions % | Branches % |',
  )
  lines.push('|------|---------|----------------|-------------|------------|')

  const cwd = process.cwd()
  const entries = Object.entries(raw)
    .filter(([k]) => k !== 'total')
    .map(([filePath, stats]) => {
      const rel = path.isAbsolute(filePath)
        ? path.relative(cwd, filePath)
        : filePath
      return [rel.split(path.sep).join('/'), stats]
    })
    .sort((a, b) => a[0].localeCompare(b[0]))

  for (const [rel, stats] of entries) {
    lines.push(
      `| \`${rel}\` | ${pctCell(stats.lines)} | ${pctCell(stats.statements)} | ${pctCell(stats.functions)} | ${pctCell(stats.branches)} |`,
    )
  }
  lines.push('')

  return lines
}

class MarkdownReporter {
  constructor() {
    this._runStart = null
  }

  onRunStart() {
    this._runStart = Date.now()
  }

  onRunComplete(_contexts, results) {
    // Coverage reporters write `coverage-summary.json` after tests; defer so the file exists.
    setImmediate(() => {
      try {
        this._writeReport(results)
      } catch (err) {
        process.stderr.write(`MarkdownReporter: ${err}\n`)
      }
    })
  }

  _writeReport(results) {
    const dir = path.join(process.cwd(), 'test_reports')
    fs.mkdirSync(dir, { recursive: true })

    const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z')
    const filePath = path.join(dir, `jest-report-${stamp}.md`)

    const durationSec =
      this._runStart != null
        ? ((Date.now() - this._runStart) / 1000).toFixed(2)
        : '—'

    const lines = []
    lines.push('# Jest Test Report')
    lines.push('')
    lines.push(`**Generated:** ${new Date().toISOString()}`)
    lines.push('')
    lines.push('## Summary')
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    lines.push(`| Passed | ${results.numPassedTests} |`)
    lines.push(`| Failed | ${results.numFailedTests} |`)
    lines.push(`| Pending / skipped | ${results.numPendingTests} |`)
    lines.push(`| Total tests | ${results.numTotalTests} |`)
    lines.push(`| Test suites passed | ${results.numPassedTestSuites} |`)
    lines.push(`| Test suites failed | ${results.numFailedTestSuites} |`)
    lines.push(`| Wall-clock duration (s) | ${durationSec} |`)
    const ok =
      results.numFailedTests === 0 && results.numFailedTestSuites === 0
    lines.push(`| Overall success | ${ok ? 'yes' : 'no'} |`)
    lines.push('')

    lines.push('## Test suites')
    lines.push('')

    for (const tr of results.testResults) {
      const rel = path.relative(process.cwd(), tr.testFilePath)
      const suiteIcon = tr.numFailingTests > 0 ? '✗' : '✓'
      lines.push(`### ${suiteIcon} \`${rel}\``)
      lines.push('')
      lines.push(`- **Duration (s):** ${(tr.perfStats.runtime / 1000).toFixed(2)}`)
      lines.push(`- **Pass / fail:** ${tr.numPassingTests} / ${tr.numFailingTests}`)
      lines.push('')

      if (tr.failureMessage) {
        lines.push('```')
        lines.push(tr.failureMessage.trimEnd())
        lines.push('```')
        lines.push('')
      }

      const assertions = tr.assertionResults || tr.testResults || []
      for (const ar of assertions) {
        const icon =
          ar.status === 'passed'
            ? '✓'
            : ar.status === 'pending'
              ? '○'
              : ar.status === 'skipped'
                ? '⊘'
                : '✗'
        const name = ar.fullName || ar.title || '(unknown)'
        lines.push(`- ${icon} ${name}`)
      }
      lines.push('')
    }

    lines.push(...buildCoverageMarkdownSection())

    fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')

    process.stdout.write(`\nMarkdown report written to ${filePath}\n`)
    process.stdout.write(
      `Coverage (HTML): ${path.join(process.cwd(), 'test_reports', 'coverage', 'index.html')}\n`,
    )
  }
}

module.exports = MarkdownReporter
