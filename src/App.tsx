// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import "./styles/main.css";

import type { Car, CarsJson, FiltersState, OwnedMap } from "./types";
import { defaultFilters } from "./types";
import { loadOwned, saveOwned, setAllOwned, toggleOwned } from "./storage";

import Filters from "./components/Filters";
import CarList from "./components/CarList";
import Modal from "./components/Modal";
import ProgressBar from "./components/ProgressBar";

function applyFilters(cars: Car[], owned: OwnedMap, f: FiltersState) {
  const q = f.q.trim().toLowerCase();

  return cars.filter((c) => {
    const isOwned = Boolean(owned[c.carId]);

    if (f.onlyOwned && !isOwned) return false;
    if (f.onlyMissing && isOwned) return false;

    if (f.maker && (c.maker ?? "") !== f.maker) return false;
    if (f.group && (c.group ?? "") !== f.group) return false;
    if (f.drivetrain && (c.drivetrain ?? "") !== f.drivetrain) return false;
    if (f.aspiration && (c.aspiration ?? "") !== f.aspiration) return false;

    if (q) {
      const hay = `${c.name} ${c.maker ?? ""} ${c.model ?? ""} ${c.group ?? ""} ${c.carId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export default function App() {
  const [cars, setCars] = useState<Car[]>([]);
  const [meta, setMeta] = useState<{ generated_at?: string; source?: string }>({});
  const [owned, setOwned] = useState<OwnedMap>(() => loadOwned());
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [selected, setSelected] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}cars.json`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((j: CarsJson) => {
        setCars(j.cars ?? []);
        setMeta({ generated_at: j.generated_at, source: j.source });
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    saveOwned(owned);
  }, [owned]);

  const ownedCount = useMemo(() => {
    let n = 0;
    for (const c of cars) if (owned[c.carId]) n++;
    return n;
  }, [cars, owned]);

  const filtered = useMemo(() => applyFilters(cars, owned, filters), [cars, owned, filters]);

  const onToggleOwned = (carId: string) => {
    setOwned((prev) => toggleOwned(prev, carId));
  };

  const onMarkAll = () => {
    setOwned(setAllOwned(cars.map((c) => c.carId), true));
  };

  const onUnmarkAll = () => {
    setOwned(setAllOwned(cars.map((c) => c.carId), false));
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loadingWrap">
          <div className="spinner" />
          Carregando carros…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="errorWrap">
          <div className="errorIcon">⚠</div>
          <div className="errorMsg">Não foi possível carregar os dados</div>
          <div className="errorSub">Verifique sua conexão e recarregue a página.</div>
        </div>
      </div>
    );
  }

  const pct = cars.length ? Math.round((ownedCount / cars.length) * 100) : 0;

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>GT7 Car Checklist</h1>
          <div className="sub">
            <span className="chip">
              Atualizado: {meta.generated_at ? new Date(meta.generated_at).toLocaleString("pt-BR") : "—"}
            </span>
          </div>
        </div>

        {meta.source ? (
          <a className="linkBtnTop" href={meta.source} target="_blank" rel="noreferrer">
            Fonte oficial
          </a>
        ) : null}
      </div>

      <div className="progressWrap">
        <div className="progressLabel">
          <span>Progresso da coleção</span>
          <span>
            {ownedCount} / {cars.length} carros{" "}
            <span className="progressPct">{pct}%</span>
          </span>
        </div>
        <ProgressBar value={cars.length ? ownedCount / cars.length : 0} />
      </div>

      <Filters
        cars={cars}
        filters={filters}
        setFilters={(fn) => setFilters((p) => fn(p))}
        ownedCount={ownedCount}
        total={cars.length}
        onMarkAll={onMarkAll}
        onUnmarkAll={onUnmarkAll}
      />

      <CarList
        cars={filtered}
        owned={owned}
        onToggleOwned={onToggleOwned}
        onOpen={(c) => setSelected(c)}
      />

      <Modal car={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
