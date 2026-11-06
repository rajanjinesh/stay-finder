"use client";

import { useSearchParams } from "next/navigation";

const FIELDS = ["destination", "checkIn", "checkOut", "adults", "children", "childAges"];

export default function ReceivedInputs() {
  const params = useSearchParams();
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
      {FIELDS.map((name) => (
        <li key={name}>
          <strong>{name}:</strong> {params.get(name) ?? "(none)"}
        </li>
      ))}
    </ul>
  );
}
