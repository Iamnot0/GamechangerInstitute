import type { EnquiryKind } from "@/lib/enquiry";

const options: readonly { value: EnquiryKind; title: string; detail: string }[] = [
  { value: "individual", title: "For myself", detail: "The individual track, for a leader at a role transition." },
  { value: "organisation", title: "For my organisation", detail: "The corporate track, for a cohort of 8 to 12 leaders." },
  { value: "general", title: "Something else", detail: "Stewardship, partnership, media or another question." },
];

type KindChooserProps = {
  value: EnquiryKind;
  onChange: (kind: EnquiryKind) => void;
};

export function KindChooser({ value, onChange }: KindChooserProps) {
  return (
    <fieldset className="kind-chooser">
      <legend className="kind-chooser__legend">I am registering interest</legend>
      <div className="kind-chooser__options">
        {options.map((option) => (
          <label key={option.value} className="kind-chooser__option">
            <input
              type="radio"
              name="kind"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="kind-chooser__input"
            />
            <span className="kind-chooser__title">{option.title}</span>
            <span className="kind-chooser__detail">{option.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
