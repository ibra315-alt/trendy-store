import { create } from "zustand";

interface CustomerFilterStore {
  search: string;
  count: number;
  setSearch: (s: string) => void;
  setCount: (n: number) => void;
}

export const useCustomerFilterStore = create<CustomerFilterStore>((set) => ({
  search: "",
  count: 0,
  setSearch: (search) => set({ search }),
  setCount: (count) => set({ count }),
}));
