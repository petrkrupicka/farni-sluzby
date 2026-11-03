"use client";

import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/dates";
import { sendTemplate } from "@/lib/mail";
import { isMainAdmin } from "@/lib/roles";
import { useParish } from "@/lib/store";

export default function BurzaPage() {
  const { state, currentUser, dispatch, claimSubstitute } = useParish();
  const admin = isMainAdmin(currentUser);
  const open = state.listings.filter((l) => !l.claimedBy);

  return (
    <div>
      <PageHeader
        title="Burza záskoků"
        subtitle="Veřejné termíny, které někdo uvolnil. Převzetí je okamžité."
      />
      <div className="space-y-3">
        {open.length === 0 ? (
          <p className="card p-5 text-muted">Teď není v burze žádný volný záskok.</p>
        ) : (
          open.map((listing) => {
            const assignment = state.assignments.find((a) => a.id === listing.assignmentId);
            if (!assignment) return null;
            const requester = state.profiles.find((p) => p.id === listing.requestedBy);
            const service = state.services.find((s) => s.id === assignment.serviceId);
            return (
              <AssignmentCard
                key={listing.id}
                assignment={assignment}
                actions={
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const res = claimSubstitute(listing.id);
                        if (!res.ok) alert(res.message);
                      }}
                    >
                      Převzít záskok
                    </button>
                    {admin ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          if (!window.confirm("Odstranit tento záskok z burzy?")) return;
                          dispatch({ type: "DELETE_LISTING", listingId: listing.id });
                          if (requester) {
                            void sendTemplate(state, "admin_removed_record", [requester], {
                              typ_zaznamu: "žádost o záskok",
                              sluzba: service?.name ?? "",
                              termin: formatDateTime(assignment.startsAt),
                              nazev: assignment.title,
                              spravce: currentUser.fullName,
                            });
                          }
                        }}
                      >
                        Odstranit
                      </button>
                    ) : null}
                  </>
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
