// src/components/Modal.tsx
import type { Car } from "../types";

type Props = {
  car: Car | null;
  onClose: () => void;
};

function kv(label: string, value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <>
      <div className="k">{label}</div>
      <div className="v">{String(value)}</div>
    </>
  );
}

export default function Modal({ car, onClose }: Props) {
  if (!car) return null;

  const thumbSrc = `${import.meta.env.BASE_URL}thumbs/${car.carId}.png`;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{car.name}</div>
            <div className="muted small">
              {car.group ?? "—"} • {car.year ?? "—"} • {car.carId}
            </div>
          </div>

          <button className="iconBtn" onClick={onClose}>Fechar</button>
        </div>

        <div className="modalBody">
          <div className="modalGrid">
            <div>
              <img className="thumbLarge" src={thumbSrc} alt={car.name} />

              <div className="pillRow">
                <div className="pill"><b>PP</b> {car.pp ? car.pp.toFixed(2) : "—"}</div>
                <div className="pill"><b>Tração</b> {car.drivetrain ?? "—"}</div>
                <div className="pill"><b>Asp.</b> {car.aspiration ?? "—"}</div>
              </div>

              {car.headline ? <div className="sectionTitle">{car.headline}</div> : null}

              {car.description?.length ? (
                <div className="desc">
                  {car.description.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <div className="bigStat">
                <div className="muted small">Detalhes</div>
                <div className="bigNum">{car.maker ?? "—"}</div>
                <div className="muted small">{car.model ?? ""}</div>
              </div>

              <div className="sectionTitle">Especificações</div>
              <div className="kv">
                {kv("Displacement (cc)", car.displacement_cc)}
                {kv(
                  "Max. Power",
                  car.max_power_value
                    ? `${car.max_power_value} ${car.max_power_unit ?? ""} ${car.max_power_rpm ? `/ ${car.max_power_rpm} rpm` : ""}`.trim()
                    : undefined
                )}
                {kv(
                  "Max. Torque",
                  car.max_torque_value
                    ? `${car.max_torque_value} ${car.max_torque_unit ?? ""} ${car.max_torque_rpm ? `/ ${car.max_torque_rpm} rpm` : ""}`.trim()
                    : undefined
                )}
                {kv("Weight (kg)", car.weight_kg)}
                {kv("Length (mm)", car.length_mm)}
                {kv("Width (mm)", car.width_mm)}
                {kv("Height (mm)", car.height_mm)}
              </div>

              <div style={{ marginTop: 14 }}>
                <a className="linkBtn" href={car.detailUrl} target="_blank" rel="noreferrer">
                  Abrir no site oficial
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
