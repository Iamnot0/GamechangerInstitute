import Link from "next/link";
import { GapMark } from "@/components/figures/GapMark";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="GameChanger Institute, home">
      <GapMark className="wordmark__mark" />
      <span className="wordmark__text">
        <span className="wordmark__name">GameChanger</span>
        <span className="wordmark__suffix">Institute</span>
      </span>
    </Link>
  );
}
