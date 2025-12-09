import { ReactNode, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import './auth-hero.css';

interface Stat {
  value: string;
  label: string;
}

interface AuthHeroProps {
  title: ReactNode;
  subtitle: string;
  highlight?: string;
  stats: Stat[];
  quote?: string;
  author?: ReactNode;
  role?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundGallery?: string[];
  slideshowIntervalMs?: number;
}

export default function AuthHero({
  title,
  subtitle,
  highlight,
  stats,
  quote,
  author,
  role,
  backgroundImageUrl,
  backgroundVideoUrl,
  backgroundGallery,
  slideshowIntervalMs = 8000
}: AuthHeroProps) {
  const gallery = useMemo(
    () => backgroundGallery?.filter(Boolean) ?? [],
    [backgroundGallery]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!gallery.length) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % gallery.length);
    }, slideshowIntervalMs);
    return () => window.clearInterval(timer);
  }, [gallery, slideshowIntervalMs]);

  const currentBackgroundImage =
    gallery.length > 0 ? gallery[activeImageIndex] : backgroundImageUrl;
  const hasGallery = gallery.length > 0;

  const renderBaseBackground = () => {
    if (backgroundVideoUrl) {
      return (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover opacity-55"
          poster={currentBackgroundImage || backgroundImageUrl}
        >
          <source src={backgroundVideoUrl} type="video/mp4" />
        </video>
      );
    }

    if (!hasGallery && currentBackgroundImage) {
      return (
        <div
          className="h-full w-full bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${currentBackgroundImage})` }}
        />
      );
    }

    return null;
  };

  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 lg:flex">
      <div className="pointer-events-none absolute inset-0">
        {renderBaseBackground()}
        {hasGallery && (
          <div className="auth-hero-gallery">
            {gallery.map((imageUrl, index) => (
              <div
                key={imageUrl}
                className={clsx(
                  'auth-hero-gallery-layer',
                  index === activeImageIndex && 'is-active'
                )}
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/20 to-secondary/30" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute right-0 bottom-16 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-between px-12 py-14 text-white">
        <div>
          {highlight && (
            <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide">
              {highlight}
            </span>
          )}
          <h2 className="auth-hero-title mt-4 text-[3rem] text-transparent uppercase tracking-[0.08em] sm:text-[4rem] lg:text-[5rem] bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-200 bg-clip-text drop-shadow-[0_5px_25px_rgba(250,204,21,0.45)]">
            {title}
          </h2>
          <p className="mt-4 max-w-lg text-base/relaxed text-white/80">{subtitle}</p>

          <dl className="mt-10 grid grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4">
                <dt className="text-xs uppercase tracking-wide text-white/60">{stat.label}</dt>
                <dd className="mt-2 text-2xl font-semibold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {(quote || author) && (
          <figure className="mt-16 rounded-2xl border border-white/15 bg-white/5 p-6 text-white/90 backdrop-blur">
            {quote && <blockquote className="text-lg italic">“{quote}”</blockquote>}
            {(author || role) && (
              <figcaption className="mt-4 text-sm font-medium flex flex-col">
                {author && <span className="text-white">{author}</span>}
                {role && <span className="text-white/70">{role}</span>}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  )
}
