import { writeFileSync } from 'node:fs';
import { CLI_OPTION_MAP, UPSTREAM } from '../src/data/upstream.ts';
const escape = value => value.replaceAll('|', '\\|');
const lines = ['# CLI option reference', '', `Revision: ${UPSTREAM.commit}. Generated from src/data/upstream.ts.`, '',
  '| Flag | Type / values | Default | Availability | Dependencies | Description / source |',
  '| --- | --- | --- | --- | --- | --- |',
  ...CLI_OPTION_MAP.map(o => `| \`${o.flag}\` | ${o.type}: ${escape(o.values)} | ${escape(o.default)} | ${o.availability} | ${escape(o.dependencies)} | [${escape(o.description)}](${o.source}) |`)];
writeFileSync('docs/cli-options.md', `${lines.join('\n')}\n`);
