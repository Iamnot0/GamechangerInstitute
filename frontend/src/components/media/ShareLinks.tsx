"use client";

import { useState } from "react";

type ShareLinksProps = { url: string; title: string };

export function ShareLinks({ url, title }: ShareLinksProps) {
  const [copied, setCopied] = useState(false);
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const places = [
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${link}&text=${text}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${link}` },
    { name: "Email", href: `mailto:?subject=${text}&body=${link}` },
  ];

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="share" aria-labelledby="share-title">
      <h2 id="share-title" className="article-aside__title">
        Share
      </h2>
      <ul className="share__list">
        {places.map((place) => (
          <li key={place.name}>
            <a href={place.href} className="share__link" target="_blank" rel="noopener noreferrer">
              {place.name}
            </a>
          </li>
        ))}
        <li>
          <button type="button" className="share__link" onClick={() => void copy()}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </li>
      </ul>
      <p className="visually-hidden" role="status">
        {copied ? "Link copied" : ""}
      </p>
    </section>
  );
}
