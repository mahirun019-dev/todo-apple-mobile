import mark from './yami-mark.json';

type YamiLogoLockupProps = {
  variant: 'sidebar' | 'mobile';
  className?: string;
};

export function YamiLogoLockup({ variant, className = '' }: YamiLogoLockupProps) {
  return (
    <div className={`yami-logo yami-logo--${variant} ${className}`.trim()} role="img" aria-label="Yami">
      <svg className="yami-logo-mark" viewBox={mark.viewBox} aria-hidden="true" focusable="false">
        {mark.paths.map((path) => <path key={path.d} d={path.d} fill={path.fill === mark.gold ? 'var(--brand-gold)' : 'var(--brand-gold-highlight)'} />)}
      </svg>
      <span className="yami-logo-wordmark" aria-hidden="true">Yami</span>
    </div>
  );
}
