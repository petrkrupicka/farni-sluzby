"use client";

import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { REQUEST_LABEL } from "@/lib/labels";
import { useParish } from "@/lib/store";

export default function SwapsPage() {
  const { state, currentUser, dispatch, assigneeLabel } = useParish();
  const incoming = state.swaps.filter((s) => s.targetId === currentUser.id);
  const outgoing = state.swaps.filter((s) => s.requesterId === currentUser.id);

  return (
    <div>
      <PageHeader
        title="Adresné výměny"
        subtitle="Po schválení se přiřazení v obou termínech automaticky prohodí."
      />
      <h2 className="font-serif text-2xl">Ke schválení</h2>
      <div className="mt-3 space-y-3">
        {incoming.length === 0 ? (
          <p className="card p-5 text-muted">Nemáte žádnou žádost k vyřízení.</p>
        ) : (
          incoming.map((swap) => {
            const from = state.assignments.find((a) => a.id === swap.fromAssignmentId);
            const to = state.assignments.find((a) => a.id === swap.toAssignmentId);
            const requester = state.profiles.find((p) => p.id === swap.requesterId);
            if (!from || !to) return null;
            return (
              <div key={swap.id} className="space-y-2">
                <p className="text-sm text-muted">
                  {requester?.fullName} nabízí {assigneeLabel(from)} ({from.title}) výměnou za váš
                  termín. Stav: {REQUEST_LABEL[swap.status]}.
                </p>
                <AssignmentCard assignment={from} />
                <AssignmentCard
                  assignment={to}
                  actions={
                    swap.status === "ceka" ? (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => dispatch({ type: "RESOLVE_SWAP", swapId: swap.id, accept: true })}
                        >
                          Schválit výměnu
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => dispatch({ type: "RESOLVE_SWAP", swapId: swap.id, accept: false })}
                        >
                          Odmítnout
                        </button>
                      </>
                    ) : null
                  }
                />
              </div>
            );
          })
        )}
      </div>
      <h2 className="mt-8 font-serif text-2xl">Odeslané žádosti</h2>
      <div className="mt-3 space-y-3">
        {outgoing.map((swap) => {
          const to = state.assignments.find((a) => a.id === swap.toAssignmentId);
          if (!to) return null;
          return (
            <div key={swap.id}>
              <p className="mb-2 text-sm text-muted">{REQUEST_LABEL[swap.status]}</p>
              <AssignmentCard assignment={to} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
