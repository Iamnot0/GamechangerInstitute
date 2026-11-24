import { FounderSection } from "@/components/sections/FounderSection";
import { PatronSection } from "@/components/sections/PatronSection";
import { PlatformsSection } from "@/components/sections/PlatformsSection";
import { StewardsSection } from "@/components/sections/StewardsSection";
import { SuccessStoriesSection } from "@/components/sections/SuccessStoriesSection";
import type { BlockKey, SiteContent } from "@/lib/site-content";

function Section({ blockKey, content }: { blockKey: BlockKey; content: SiteContent }) {
  switch (blockKey) {
    case "success_stories":
    case "client_logos":
      return <SuccessStoriesSection stories={content.success_stories} logos={content.client_logos} />;
    case "founder":
      return <FounderSection founder={content.founder} />;
    case "stewards":
      return <StewardsSection stewards={content.stewards} />;
    case "platforms":
      return <PlatformsSection platforms={content.platforms} />;
    case "patron":
      return <PatronSection patron={content.patron} />;
  }
}

/** The public section itself, drawn at desktop width and scaled down, so the preview cannot drift from the site. */
export function BlockPreview({ blockKey, content }: { blockKey: BlockKey; content: SiteContent | null }) {
  return (
    <div className="block-preview">
      <h2 className="block-preview__title">How it will look</h2>
      {content ? (
        <div className="block-preview__frame" inert>
          <div className="block-preview__stage">
            <Section blockKey={blockKey} content={content} />
          </div>
        </div>
      ) : (
        <p className="block-preview__empty">Choose a photo for every entry to see the preview.</p>
      )}
    </div>
  );
}
