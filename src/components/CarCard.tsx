// src/components/CarCard.tsx
import { useState } from "react";
import type { Car } from "../types";

type Props = {
  car: Car;
  owned: boolean;
  onToggleOwned: () => void;
  onOpen: () => void;
};

export default function CarCard({ car, owned, onToggleOwned, onOpen }: Props) {
  const thumbSrc = `${import.meta.env.BASE_URL}thumbs/${car.carId}.png`;
  const [imgError, setImgError] = useState(false);

  return (
    <tr className={owned ? "owned" : ""} onClick={onOpen} style={{ cursor: "pointer" }}>
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
          <span>{car.group ?? "—"}</span>
          <span>•</span>
          <span>{car.year ?? "—"}</span>
          <span>•</span>
          <span>{car.carId}</span>
        </div>
      </td>

      <td className="colPP">{car.pp ? car.pp.toFixed(2) : "—"}</td>
      <td className="colDrive">{car.drivetrain ?? "—"}</td>
      <td className="colAsp">{car.aspiration ?? "—"}</td>
    </tr>
  );
}
