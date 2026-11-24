import { socialProfiles, type SocialNetwork } from "@/content/site";

const marks: Record<SocialNetwork, string> = {
  LinkedIn:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.850 3.370-1.850 3.601 0 4.267 2.370 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.920-2.063 2.063-2.063 1.140 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.200 24 24 23.227 24 22.271V1.729C24 .774 23.200 0 22.222 0h.003z",
  Facebook:
    "M9.101 23.691v-7.980H6.627v-3.667h2.474v-1.580c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.680 8.680 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.420-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.350 9.101 11.647Z",
  X: "M18.901 1.153h3.680l-8.040 9.190L24 22.846h-7.406l-5.800-7.584-6.638 7.584H.474l8.600-9.830L0 1.154h7.594l5.243 6.932ZM17.610 20.644h2.039L6.486 3.240H4.298Z",
};

/** Each network's mark. It is a link once the Institute's page there is known; until then it is only shown. */
export function SocialLinks() {
  return (
    <ul className="social-links" aria-label="GameChanger Institute elsewhere">
      {socialProfiles.map(({ network, url }) => {
        const mark = (
          <svg className="social-links__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={marks[network]} />
          </svg>
        );
        return (
          <li key={network}>
            {url ? (
              <a href={url} className="social-links__item" target="_blank" rel="noopener noreferrer">
                {mark}
                <span className="visually-hidden">GameChanger Institute on {network}</span>
              </a>
            ) : (
              <span className="social-links__item" title={`${network}: link coming soon`}>
                {mark}
                <span className="visually-hidden">{network}: link coming soon</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
