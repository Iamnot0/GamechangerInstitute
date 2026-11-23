import { lenses } from "@/content/programme";

export function LensStack() {
  return (
    <div className="lens-stack" aria-hidden="true">
      <div className="lens-stack__scene">
        {lenses.map((lens, index) => (
          <div key={lens.id} className="lens-stack__plane">
            <span className="lens-stack__index">{index + 1}</span>
            <span className="lens-stack__name">{lens.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
