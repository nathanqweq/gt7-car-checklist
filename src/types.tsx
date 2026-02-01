// src/types.tsx
export type CarsJson = {
  generated_at: string;
  source: string;
  cars: Car[];
};

export type Car = {
  id: string;
  carId: string;

  maker?: string;
  model?: string;
  name: string;
  year?: number;

  thumb?: string; // vamos preferir /thumbs/${carId}.png no front
  detailUrl: string;

  pp?: number;
  group?: string;

  drivetrain?: string;
  aspiration?: string;
  displacement_cc?: number;

  max_power_value?: number;
  max_power_unit?: string;
  max_power_rpm?: number;

  max_torque_value?: number;
  max_torque_unit?: string;
  max_torque_rpm?: number;

  weight_kg?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;

  headline?: string;
  description?: string[];
  descriptionText?: string;
};

export type OwnedMap = Record<string, boolean>;

export type FiltersState = {
  q: string;
  onlyOwned: boolean;
  onlyMissing: boolean;

  maker: string;      // "" = todos
  group: string;      // "" = todos
  drivetrain: string; // "" = todos
  aspiration: string; // "" = todos
};

export const defaultFilters: FiltersState = {
  q: "",
  onlyOwned: false,
  onlyMissing: false,
  maker: "",
  group: "",
  drivetrain: "",
  aspiration: "",
};
