"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { isOnServiceTeam, useParish } from "@/lib/store";

export default function ServicesPage() {
  const { state, currentUser, canAccessServiceSettings, dispatch } = useParish();

  return (
    <div>
      <PageHeader
        title="Farní služby"
        subtitle="Přihlášením se stáváte členem služby. U týmových služeb vás správce týmu nebo hlavní správce zařadí do čety."
      />
      {canAccessServiceSettings ? (
        <p className="card mb-4 p-4 text-sm text-muted">
          Rozvrh, výměny a správce služby nastavíte v{" "}
          <Link className="font-semibold text-forest underline" href="/panel/nastaveni/sluzby">
            Nastavení → Služby
          </Link>
          .
        </p>
      ) : null}
      <div className="grid gap-3">
        {state.services.map((service) => {
          const membership = state.memberships.find(
            (m) => m.serviceId === service.id && m.userId === currentUser.id,
          );
          const onTeam = isOnServiceTeam(state, currentUser.id, service.id);
          const waitingForTeam =
            Boolean(membership) && service.assignmentMode === "tymy" && !onTeam;
          return (
            <article key={service.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">{service.name}</h2>
                </div>
                {membership ? (
                  <span className={waitingForTeam ? "badge badge-swap" : "badge badge-mine"}>
                    {waitingForTeam ? "Čeká na zařazení do týmu" : "Člen služby"}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm">
                Správce služby:{" "}
                <strong>
                  {service.managerIds
                    .map((id) => state.profiles.find((p) => p.id === id)?.fullName)
                    .filter(Boolean)
                    .join(", ") || "není přiřazen"}
                </strong>
              </p>
              {waitingForTeam ? (
                <p className="mt-3 text-sm text-amber">
                  Jste členem služby. Do plánu se dostanete, až vás správce zařadí do týmu.
                </p>
              ) : null}
              {!membership ? (
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => dispatch({ type: "REGISTER", serviceId: service.id })}
                >
                  Přihlásit se ke službě
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
