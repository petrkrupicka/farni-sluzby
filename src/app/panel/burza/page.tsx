"use client";

import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { useParish } from "@/lib/store";

export default function BurzaPage() {
  const { state, claimSubstitute } = useParish();
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
            return (
              <AssignmentCard
                key={listing.id}
                assignment={assignment}
                actions={
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const res = claimSubstitute(listing.id);
                      if (!res.ok) alert(res.message);
                    }}
                  >
                    Převzít záskok
                  </button>
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
