"use client";

import { useEffect, useRef } from "react";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const command = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        <button type="button" className="btn btn-ghost min-h-9 px-3 text-sm" onClick={() => command("bold")}>
          Tučně
        </button>
        <button type="button" className="btn btn-ghost min-h-9 px-3 text-sm italic" onClick={() => command("italic")}>
          Kurzíva
        </button>
        <button
          type="button"
          className="btn btn-ghost min-h-9 px-3 text-sm"
          onClick={() => command("insertUnorderedList")}
        >
          Odrážky
        </button>
        <button
          type="button"
          className="btn btn-ghost min-h-9 px-3 text-sm"
          onClick={() => command("insertOrderedList")}
        >
          Číslování
        </button>
        <button
          type="button"
          className="btn btn-ghost min-h-9 px-3 text-sm"
          onClick={() => {
            const url = window.prompt("Odkaz (https://…)");
            if (url) command("createLink", url);
          }}
        >
          Odkaz
        </button>
      </div>
      <div
        ref={ref}
        className="min-h-40 p-3 outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}
