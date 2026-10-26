import { CalendarCheck, Handshake, Store } from "lucide-react";
import { STATUS_LABEL } from "@/lib/labels";
import type { AssignmentStatus } from "@/lib/types";

const ICONS = {
  prirazeno: CalendarCheck,
  ceka_na_vymenu: Handshake,
  volny_zaskok: Store,
};

const CLASS = {
  prirazeno: "badge-mine",
  ceka_na_vymenu: "badge-swap",
  volny_zaskok: "badge-open",
};

export function StatusBadge({
  status,
  mine = false,
}: {
  status: AssignmentStatus;
  mine?: boolean;
}) {
  const Icon = ICONS[status];
  const label =
    status === "prirazeno" && mine ? "Moje služba" : STATUS_LABEL[status];
  const className =
    status === "prirazeno" && !mine ? "badge-assigned" : CLASS[status];
  return (
    <span className={`badge ${className}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}
