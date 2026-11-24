"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addStaffMember, removeStaffMember } from "@/lib/admin-actions";
import type { StaffRole, StaffUserItem } from "@/lib/admin-types";
import { formatDateTime } from "@/lib/format";

type StaffManagerProps = {
  users: readonly StaffUserItem[];
  currentUserId: string | null;
};

const roleLabels: Record<StaffRole, string> = {
  admin: "Administrator",
  staff: "Staff",
};

export function StaffManager({ users, currentUserId }: StaffManagerProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submitAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const targetEmail = email.trim().toLowerCase();
    startTransition(async () => {
      const result = await addStaffMember(targetEmail, role);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEmail("");
      setRole("staff");
      setNotice(`Granted access to ${targetEmail} and sent an invitation email.`);
    });
  };

  const confirmRemove = (user: StaffUserItem) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await removeStaffMember(user.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmingId(null);
      setNotice(`Removed access for ${user.email}.`);
    });
  };

  return (
    <div className="admin-page">
      <section aria-labelledby="add-staff-heading" className="enquiry__panel">
        <h2 id="add-staff-heading" className="admin-section__title">
          Invite staff member
        </h2>
        <form className="staff-add-form" onSubmit={submitAdd} aria-busy={pending}>
          <label className="admin-filters__field" htmlFor="invite-email">
            <span className="form-field__label">Email address</span>
            <input
              id="invite-email"
              type="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder="colleague@gamechanger.institute"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="admin-filters__field" htmlFor="invite-role">
            <span className="form-field__label">Role</span>
            <select
              id="invite-role"
              className="form-control"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
            >
              <option value="staff">Staff (Enquiries and News)</option>
              <option value="admin">Administrator (includes Staff access)</option>
            </select>
          </label>
          <div className="admin-filters__actions">
            <button type="submit" className="button button--primary" disabled={pending}>
              {pending ? "Adding…" : "Grant access"}
            </button>
          </div>
        </form>
        {error ? (
          <p className="form-field__error staff-manager__feedback" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="status-form__saved staff-manager__feedback" role="status">
            {notice}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="staff-list-heading">
        <h2 id="staff-list-heading" className="admin-section__title">
          Authorised accounts ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="admin-empty">No staff accounts are listed yet. Use the form above to grant access.</p>
        ) : (
          <table className="admin-table__table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Last signed in</th>
                <th scope="col">Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const confirming = confirmingId === user.id;
                return (
                  <tr key={user.id}>
                    <th scope="row">
                      <span className="admin-table__name">{user.email}</span>
                    </th>
                    <td data-label="Role">{roleLabels[user.role]}</td>
                    <td data-label="Last signed in">
                      {user.last_signed_in_at ? formatDateTime(user.last_signed_in_at) : "Never"}
                    </td>
                    <td data-label="Access">
                      {isSelf ? (
                        <span className="admin-table__email">Your account</span>
                      ) : confirming ? (
                        <div className="staff-manager__confirm">
                          <button
                            type="button"
                            className="text-button text-button--danger"
                            disabled={pending}
                            onClick={() => confirmRemove(user)}
                          >
                            {pending ? "Removing…" : "Yes, revoke"}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={pending}
                            onClick={() => setConfirmingId(null)}
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-button text-button--danger"
                          disabled={pending}
                          onClick={() => setConfirmingId(user.id)}
                        >
                          Revoke access
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
