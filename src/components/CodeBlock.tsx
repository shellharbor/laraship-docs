import { useState } from 'react';
import type { translator } from '../i18n';
import { Icon } from './Icon';

export function CodeBlock({ title, code, copyLabel, t }: { title: string; code: string; copyLabel: string; t: ReturnType<typeof translator> }) {
  const [status, setStatus] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setStatus(t('Copied', 'Скопировано')); }
    catch { setStatus(t('Clipboard unavailable. Select the command below and copy manually.', 'Буфер обмена недоступен. Выделите и скопируйте команду вручную.')); }
  };
  return <div className="code-block"><div className="code-toolbar"><span>{title}</span><button type="button" onClick={copy} aria-label={copyLabel}><Icon name="copy" size={15}/>{copyLabel}</button></div><pre tabIndex={0}><code>{code}</code></pre><span className="copy-status" role="status">{status}</span></div>;
}
