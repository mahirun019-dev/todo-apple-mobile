import mark from './yami-mark.json';
import wordmark from './yami-wordmark.json';

type YamiLogoLockupProps = {
  variant: 'sidebar' | 'mobile';
  className?: string;
};

export function YamiWordmark({ className = '' }: { className?: string }) {
  return (
    <svg className={`yami-logo-wordmark ${className}`.trim()} viewBox={wordmark.viewBox} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter" strokeWidth={wordmark.strokeWidth}>
        {wordmark.strokes.map((path) => <path key={path} d={path} />)}
      </g>
      <path d={mark.paths[wordmark.glint.sourceMarkPathIndex].d} transform={wordmark.glint.transform} fill="var(--brand-gold-highlight)" />
    </svg>
  );
}

export function YamiBrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`yami-logo-mark ${className}`.trim()} viewBox={mark.viewBox} aria-hidden="true" focusable="false">
      {mark.paths.map((path) => <path key={path.d} d={path.d} fill={path.fill === mark.gold ? 'var(--brand-gold)' : 'var(--brand-gold-highlight)'} />)}
    </svg>
  );
}

export function YamiLogoLockup({ variant, className = '' }: YamiLogoLockupProps) {
  return (
    <div className={`yami-logo yami-logo--${variant} ${className}`.trim()} role="img" aria-label="Yami">
      <YamiBrandMark />
      <YamiWordmark />
    </div>
  );
}
