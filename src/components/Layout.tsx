import type { ReactNode } from 'react';
import { back, go } from '../lib/router';

export function Header({
  title,
  onBack,
  right,
}: {
  title: ReactNode;
  onBack?: (() => void) | string;
  right?: ReactNode;
}) {
  const handleBack = () => (typeof onBack === 'string' ? back(onBack) : onBack?.());
  return (
    <header className="header">
      <div className="header-side">
        {onBack && (
          <button className="icon-btn" onClick={handleBack} aria-label="戻る">
            ‹
          </button>
        )}
      </div>
      <h1 className="header-title">{title}</h1>
      <div className="header-side right">{right}</div>
    </header>
  );
}

const TABS = [
  { id: 'home', label: 'ホーム', icon: '⌂', to: '/' },
  { id: 'calendar', label: 'カレンダー', icon: '▦', to: '/calendar' },
  { id: 'summary', label: '月間', icon: 'Σ', to: '/summary' },
  { id: 'graph', label: '体重', icon: '↘', to: '/graph' },
  { id: 'settings', label: '設定', icon: '⚙', to: '/settings' },
];

export function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={'tab' + (active === t.id ? ' active' : '')}
          onClick={() => go(t.to)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="tab-icon" aria-hidden>
            {t.icon}
          </span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EstimateNote({ children }: { children?: ReactNode }) {
  return (
    <p className="estimate-note">
      ※ {children ?? 'カロリーはすべて推定値（目安）です。'}
    </p>
  );
}
