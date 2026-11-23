import { statusLabels, type EnquiryDetail } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";

export function EventTimeline({ enquiry }: { enquiry: EnquiryDetail }) {
  return (
    <section className="event-timeline" aria-labelledby="event-timeline-title">
      <h2 id="event-timeline-title" className="admin-section__title">
        History
      </h2>
      <ol className="event-timeline__list">
        {enquiry.events.map((event) => (
          <li key={event.id} className="event-timeline__item">
            <p className="event-timeline__what">
              {event.from_status && event.to_status
                ? `${statusLabels[event.from_status]} to ${statusLabels[event.to_status]}`
                : "Status changed"}
            </p>
            <p className="event-timeline__meta">
              {event.actor_email ?? "Staff member"} · {formatDateTime(event.created_at)}
            </p>
            {event.note ? <p className="event-timeline__note">{event.note}</p> : null}
          </li>
        ))}
        <li className="event-timeline__item">
          <p className="event-timeline__what">Received from the website</p>
          <p className="event-timeline__meta">{formatDateTime(enquiry.created_at)}</p>
        </li>
      </ol>
    </section>
  );
}
