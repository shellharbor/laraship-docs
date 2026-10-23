import { writeFileSync } from 'node:fs';
import { CLI_OPTION_MAP, UPSTREAM } from '../src/data/upstream.ts';
const escape = value => value.replaceAll('|', '\\|');
const lines = ['# CLI option reference', '', `Revision: ${UPSTREAM.commit}. Generated from src/data/upstream.ts.`, '',
  'The wizard defaults to the complete Advanced form. Availability describes option complexity or a server-only template, not a separate documentation-only implementation. Basic is an optional shorter view. See [wizard field locations](argument-coverage.md).', '',
  '| Flag | Type / values | Default | Availability | Dependencies | Description / source |',
  '| --- | --- | --- | --- | --- | --- |',
  ...CLI_OPTION_MAP.map(o => `| \`${o.flag}\` | ${o.type}: ${escape(o.values)} | ${escape(o.default)} | ${o.availability} | ${escape(o.dependencies)} | [${escape(o.description)}](${o.source}) |`)];
writeFileSync('docs/cli-options.md', `${lines.join('\n')}\n`);
