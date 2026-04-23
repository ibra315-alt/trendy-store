import { create } from "zustand";

interface OrderFilterStore {
  activeTab: string;
  search: string;
  setActiveTab: (v: string) => void;
  setSearch: (v: string) => void;
}

export const useOrderFilterStore = create<OrderFilterStore>((set) => ({
  activeTab: "active",
  search: "",
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearch: (search) => set({ search }),
}));
