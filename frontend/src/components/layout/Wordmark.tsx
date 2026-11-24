import Link from "next/link";
import { PillarMark } from "@/components/figures/PillarMark";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="GameChanger Institute, home">
      <PillarMark className="wordmark__mark" />
      <span className="wordmark__text">
        <span className="wordmark__name">GameChanger</span>
        <span className="wordmark__suffix">Institute</span>
      </span>
    </Link>
  );
}
