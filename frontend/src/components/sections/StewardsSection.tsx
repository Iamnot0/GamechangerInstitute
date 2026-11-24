import { membershipTiers, method, stewards } from "@/content/institute";

export function StewardsSection() {
  return (
    <section className="stewards" aria-labelledby="stewards-title">
      <div className="stewards__inner">
        <div className="stewards__block">
          <h2 id="stewards-title" className="stewards__title">
            {stewards.title}
          </h2>
          <p>{stewards.body}</p>
        </div>

        <div className="stewards__block">
          <h2 className="stewards__title">{method.title}</h2>
          <ol className="stewards__method" aria-label="GCI design-thinking method">
            {method.stages.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
          <p>{method.body}</p>
        </div>

        <div className="stewards__block">
          <h2 className="stewards__title">Membership</h2>
          <p>
            Leaders join the Institute at four tiers. Individual-track participants can enter the programme through
            membership.
          </p>
          <ul className="stewards__tiers">
            {membershipTiers.map((tier) => (
              <li key={tier}>{tier}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
