// src/components/CarCard.tsx
import { useState } from "react";
import type { Car } from "../types";

type Props = {
  car: Car;
  owned: boolean;
  onToggleOwned: () => void;
  onOpen: () => void;
};

const GROUP_COLORS: Record<string, string> = {
  "Gr.1": "#c084fc",
  "Gr.2": "#60a5fa",
  "Gr.3": "#4ade80",
  "Gr.4": "#facc15",
  "Gr.B": "#fb923c",
  "Gr.N": "#22d3ee",
  "Gr.X": "#f87171",
};

function groupColor(group: string | undefined): string {
  if (!group) return "rgba(255,255,255,0.35)";
  for (const key of Object.keys(GROUP_COLORS)) {
    if (group.startsWith(key)) return GROUP_COLORS[key];
  }
  if (/^N\d/.test(group)) return "#67e8f9";
  return "rgba(255,255,255,0.45)";
}

function shortAsp(asp: string | undefined): string {
  if (!asp) return "—";
  if (/natural/i.test(asp)) return "NA";
  if (/turbo.*super|super.*turbo/i.test(asp)) return "T+SC";
  if (/turbo/i.test(asp)) return "Turbo";
  if (/super/i.test(asp)) return "SC";
  if (/electric/i.test(asp)) return "EV";
  return asp.split(" ")[0];
}

export default function CarCard({ car, owned, onToggleOwned, onOpen }: Props) {
  const thumbSrc = `${import.meta.env.BASE_URL}thumbs/${car.carId}.png`;
  const [imgError, setImgError] = useState(false);

  return (
    <tr className={owned ? "owned" : ""} onClick={onOpen}>
      <td className="colCheck" onClick={(e) => e.stopPropagation()}>
        <label className="cb">
          <input type="checkbox" checked={owned} onChange={onToggleOwned} />
          <span className="cbBox" />
        </label>
      </td>

      <td className="colThumb">
        {imgError ? (
          <div className="thumbError">—</div>
        ) : (
          <img
            className="thumb"
            src={thumbSrc}
            alt={car.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </td>

      <td className="model">
        <div className="nameLine">{car.name}</div>
        <div className="kicker small">
          <span className="groupBadge" style={{ color: groupColor(car.group) }}>
            {car.group ?? "—"}
          </span>
          <span className="kickerSep">·</span>
          <span className="muted">{car.year ?? "—"}</span>
        </div>
      </td>

      <td className="colPP">
        <span className="ppValue">{car.pp ? car.pp.toFixed(1) : "—"}</span>
      </td>
      <td className="colDrive">
        <span className="driveValue">{car.drivetrain ?? "—"}</span>
      </td>
      <td className="colAsp">
        <span className="aspValue">{shortAsp(car.aspiration)}</span>
      </td>
    </tr>
  );
}
