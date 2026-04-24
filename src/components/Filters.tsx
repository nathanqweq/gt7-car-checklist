// src/components/Filters.tsx
import type { Car, FiltersState } from "../types";
import { defaultFilters } from "../types";

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

function hasActiveFilters(f: FiltersState) {
  return f.q || f.maker || f.group || f.drivetrain || f.aspiration || f.onlyOwned || f.onlyMissing;
}

export default function Filters(props: Props) {
  const { cars, filters, setFilters, ownedCount, total, onMarkAll, onUnmarkAll } = props;

  const makers = uniqSorted(cars.map((c) => c.maker));
  const groups = uniqSorted(cars.map((c) => c.group));
  const drives = uniqSorted(cars.map((c) => c.drivetrain));
  const asps = uniqSorted(cars.map((c) => c.aspiration));

  const resetFilters = () => setFilters(() => defaultFilters);

  return (
    <div className="filters">
      <div className="filtersTop">
        <div className="chip">
          <b>{ownedCount}</b>/{total} ({total ? Math.round((ownedCount / total) * 100) : 0}%)
        </div>

        <div className="filtersBtns">
          <button className="btn" onClick={onMarkAll}>Marcar todos</button>
          <button className="btn" onClick={onUnmarkAll}>Desmarcar todos</button>
          {hasActiveFilters(filters) && (
            <button className="btn btnReset" onClick={resetFilters}>✕ Limpar filtros</button>
          )}
        </div>
      </div>

      <div className="filtersGrid">
        <input
          className="input searchInput"
          placeholder="Buscar por nome, fabricante, grupo…"
          value={filters.q}
          onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
        />

        <select
          className="select"
          value={filters.maker}
          onChange={(e) => setFilters((p) => ({ ...p, maker: e.target.value }))}
        >
          <option value="">Fabricante (todos)</option>
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

        <div className="filtersToggles">
          <label className="filterToggle">
            <span className="cb" style={{ pointerEvents: "none" }}>
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
              <span className="cbBox" />
            </span>
            Só os que tenho
          </label>

          <label className="filterToggle">
            <span className="cb" style={{ pointerEvents: "none" }}>
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
              <span className="cbBox" />
            </span>
            Só os que faltam
          </label>
        </div>
      </div>
    </div>
  );
}
