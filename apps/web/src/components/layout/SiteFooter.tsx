import { useState } from 'react';

const REPO_URL = 'https://github.com/raulizqli/f-pokemon-manager';
const SHARE_TEXT =
  'Check out PokéDex Manager — a full-stack Pokémon collection app. Star it on GitHub!';
const SHARE_CAPTION = `${SHARE_TEXT}\n${REPO_URL}`;

const FACEBOOK_SHARE_URL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(REPO_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`;

const shareButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm font-medium text-poke-dark transition hover:border-poke-sage hover:text-poke-sage';

export function SiteFooter() {
  const [igNotice, setIgNotice] = useState<string | null>(null);

  async function shareOnInstagram() {
    try {
      await navigator.clipboard.writeText(SHARE_CAPTION);
      setIgNotice('Caption copied — paste it into your Instagram post.');
    } catch {
      setIgNotice('Copy this link into Instagram: ' + REPO_URL);
    }
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    window.setTimeout(() => setIgNotice(null), 5000);
  }

  return (
    <footer className="mt-auto border-t border-poke-dark/10 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:text-left">
        <div className="space-y-1">
          <p className="text-sm text-poke-dark/55">PokéDex Manager — open source on GitHub</p>
          {igNotice && <p className="text-xs text-poke-sage">{igNotice}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={shareButtonClass}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Star on GitHub
          </a>
          <a
            href={FACEBOOK_SHARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={shareButtonClass}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Share on Facebook
          </a>
          <button type="button" onClick={() => void shareOnInstagram()} className={shareButtonClass}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Share on Instagram
          </button>
        </div>
      </div>
    </footer>
  );
}
