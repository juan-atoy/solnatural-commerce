import { useQuery } from "@tanstack/react-query";

import { fetchStoreSettings } from "@/services/supabase/catalog";

export function useStoreSettings() {
  return useQuery({ queryKey: ["store-settings"], queryFn: fetchStoreSettings, staleTime: 60_000 });
}
