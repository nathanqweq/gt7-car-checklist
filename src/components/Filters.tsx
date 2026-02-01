// src/components/Filters.tsx
import type { Car, FiltersState } from "../types";

type Props = {
  cars: Car[];
  filters: FiltersState;
  setFilters: (fn: (prev: FiltersState) => FiltersState) => void;

  ownedCount: number;
  total: number;

  onMarkAll: () => void;
  onUnmarkAll: () => void;
};

function uniqSorted(values: Array<string | undefined>) {
  const s = new Set(values.map((v) => (v ?? "").trim()).filter(Boolean));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

export default function Filters(props: Props) {
  const { cars, filters, setFilters, ownedCount, total, onMarkAll, onUnmarkAll } = props;

  const makers = uniqSorted(cars.map((c) => c.maker));
  const groups = uniqSorted(cars.map((c) => c.group));
  const drives = uniqSorted(cars.map((c) => c.drivetrain));
  const asps = uniqSorted(cars.map((c) => c.aspiration));

  return (
    <div className="filters">
      <div className="filtersTop">
        <div className="chip">
          <b>{ownedCount}</b>/{total} ({total ? Math.round((ownedCount / total) * 100) : 0}%)
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={onMarkAll}>Marcar todos</button>
          <button className="btn" onClick={onUnmarkAll}>Desmarcar todos</button>
        </div>
      </div>

      <div className="filtersGrid">
        <input
          className="input"
          placeholder="Buscar por nome…"
          value={filters.q}
          onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
        />

        <select
          className="select"
          value={filters.maker}
          onChange={(e) => setFilters((p) => ({ ...p, maker: e.target.value }))}
        >
          <option value="">Maker (todos)</option>
          {makers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          className="select"
          value={filters.group}
          onChange={(e) => setFilters((p) => ({ ...p, group: e.target.value }))}
        >
          <option value="">Grupo (todos)</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          className="select"
          value={filters.drivetrain}
          onChange={(e) => setFilters((p) => ({ ...p, drivetrain: e.target.value }))}
        >
          <option value="">Tração (todas)</option>
          {drives.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          className="select"
          value={filters.aspiration}
          onChange={(e) => setFilters((p) => ({ ...p, aspiration: e.target.value }))}
        >
          <option value="">Aspiração (todas)</option>
          {asps.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.onlyOwned}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                onlyOwned: e.target.checked,
                onlyMissing: e.target.checked ? false : p.onlyMissing,
              }))
            }
          />
          <span>Mostrar só os que tenho</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.onlyMissing}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                onlyMissing: e.target.checked,
                onlyOwned: e.target.checked ? false : p.onlyOwned,
              }))
            }
          />
          <span>Mostrar só os que faltam</span>
        </label>
      </div>
    </div>
  );
}
