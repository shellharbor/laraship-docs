import { useId } from 'react';
import { PRESETS, PRESET_NAMES } from '../../data/upstream';
import { presetBlock } from '../../domain/constraints';
import type { PresetName, WizardConfig } from '../../domain/wizardSchema';
import { translator, type Language } from '../../i18n';

export function PresetPicker({ config, language, onToggle, onClear }: {
  config: WizardConfig; language: Language; onToggle: (preset: PresetName) => void; onClear: () => void;
}) {
  const t = translator(language);
  const id = useId();
  return <fieldset className="presets" aria-describedby={`${id}-help`}>
    <legend>{t('Start with a preset', 'Начните с пресета')} <span>{t('optional · choose several', 'необязательно · можно несколько')}</span></legend>
    <div className="preset-grid">
      <button type="button" className={`preset-none ${config.presets.length ? '' : 'active'}`} aria-pressed={config.presets.length === 0} onClick={onClear}>
        <strong>{t('No presets', 'Без пресетов')}</strong><small>{t('Clear presets; keep your own service choices.', 'Сбросить пресеты, сохранив выбранные вручную сервисы.')}</small>
      </button>
      {PRESET_NAMES.map(preset => {
        const block = presetBlock(config, preset);
        const reason = block === 'source' ? t('New applications only: this preset installs Filament or Horizon.', 'Только для нового приложения: пресет устанавливает Filament или Horizon.')
          : block === 'horizon' ? config.presets.includes('api')
            ? t('Cannot combine with api: Queue worker conflicts with Horizon.', 'Нельзя совместить с api: Queue worker конфликтует с Horizon.')
            : t('Remove the selected Horizon service first: it conflicts with Queue worker.', 'Сначала отключите выбранный Horizon: он конфликтует с Queue worker.')
          : block === 'queue' ? config.presets.includes('admin-panel')
            ? t('Cannot combine with admin-panel: Horizon conflicts with Queue worker.', 'Нельзя совместить с admin-panel: Horizon конфликтует с Queue worker.')
            : t('Remove the selected Queue worker service first: it conflicts with Horizon.', 'Сначала отключите выбранный Queue worker: он конфликтует с Horizon.') : '';
        return <label key={preset} className={config.presets.includes(preset) ? 'active' : ''}>
          <input type="checkbox" name="presets" value={preset} checked={config.presets.includes(preset)} disabled={!!block} aria-labelledby={`${id}-${preset}-title`} aria-describedby={`${id}-${preset}-details${block ? ` ${id}-${preset}-reason` : ''}`} onChange={() => onToggle(preset)}/>
          <strong id={`${id}-${preset}-title`}>{preset}</strong>
          <small id={`${id}-${preset}-details`}>{PRESETS[preset].modules.map(module => module === 'queue' ? 'Queue' : module === 'horizon' ? 'Horizon' : module === 'filament' ? 'Filament' : 'Redis').join(' · ')}{PRESETS[preset].basicAuth && ' · Basic Auth'}{PRESETS[preset].upload && ` · ${PRESETS[preset].upload}`}</small>
          {block && <small id={`${id}-${preset}-reason`} className="preset-reason">{reason}</small>}
        </label>;
      })}
    </div>
    <p className="hint" id={`${id}-help`}>{t('Compatible presets add their features together. Uncheck a preset to remove its features; manually selected services remain. All project ports bind to loopback.', 'Совместимые пресеты объединяют возможности. Снимите пресет, чтобы убрать его опции; выбранные вручную сервисы сохранятся. Порты проекта слушают loopback.')}</p>
    <p className="hint preset-selection" role="status">{config.presets.length ? `${t('Selected:', 'Выбраны:')} ${config.presets.join(' + ')}` : t('No presets selected.', 'Пресеты не выбраны.')}</p>
  </fieldset>;
}
