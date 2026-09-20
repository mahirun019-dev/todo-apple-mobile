import brandIllustration from '../assets/brand/yami-brand-illustration.png';
import wordmarkDark from '../assets/brand/yami-primary-wordmark-dark.png';
import wordmarkLight from '../assets/brand/yami-primary-wordmark-light.png';

type YamiLogoLockupProps = {
  variant: 'sidebar' | 'mobile';
  className?: string;
};

export function YamiWordmark({ className = '', label }: { className?: string; label?: string }) {
  return (
    <span className={`yami-wordmark-assets ${className}`.trim()} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <img className="yami-wordmark-image yami-wordmark-image--light" src={wordmarkLight} alt="" />
      <img className="yami-wordmark-image yami-wordmark-image--dark" src={wordmarkDark} alt="" />
    </span>
  );
}

export function YamiBrandAvatar({ className = '', alt = 'Yami brand illustration' }: { className?: string; alt?: string }) {
  return <img className={`yami-brand-avatar ${className}`.trim()} src={brandIllustration} alt={alt} />;
}

export function YamiAboutBrand() {
  return (
    <div className="yami-about-brand" role="img" aria-label="Yami">
      <YamiBrandAvatar alt="" />
      <YamiWordmark />
    </div>
  );
}

export function YamiLogoLockup({ variant, className = '' }: YamiLogoLockupProps) {
  return (
    <div className={`yami-logo yami-logo--${variant} ${className}`.trim()} role="img" aria-label="Yami">
      <YamiWordmark />
    </div>
  );
}
