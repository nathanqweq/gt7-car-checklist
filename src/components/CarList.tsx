// src/components/CarList.tsx
import type { Car, OwnedMap } from "../types";
import CarCard from "./CarCard";

type Props = {
  cars: Car[];
  owned: OwnedMap;
  onToggleOwned: (carId: string) => void;
  onOpen: (car: Car) => void;
};

export default function CarList({ cars, owned, onToggleOwned, onOpen }: Props) {
  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            <th className="colCheck">Tenho</th>
            <th className="colThumb"></th>
            <th>Carro</th>
            <th className="colPP">PP</th>
            <th className="colDrive">Tração</th>
            <th className="colAsp">Asp.</th>
          </tr>
        </thead>
        <tbody>
          {cars.map((c) => (
            <CarCard
              key={c.carId}
              car={c}
              owned={Boolean(owned[c.carId])}
              onToggleOwned={() => onToggleOwned(c.carId)}
              onOpen={() => onOpen(c)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
