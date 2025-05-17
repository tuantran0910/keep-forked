import { useCallback } from "react";
import { useApi } from "@/shared/lib/hooks/useApi";
import { Conversation, getUserConversations } from "../api/client";
import useSWR, { KeyedMutator } from "swr";

interface UseConversationsOptions {
  initialData?: Conversation[];
}

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;
  mutate: KeyedMutator<Conversation[]>;
}

export function useConversations({
  initialData = [],
}: UseConversationsOptions): UseConversationsReturn {
  const api = useApi();
  const fetchKey = `/ai-assistant/conversations`;

  const fetcher = useCallback(async () => {
    if (!api) return initialData;
    return await getUserConversations(api);
  }, [api, initialData]);

  const { data, error, mutate, isLoading } = useSWR<Conversation[], Error>(
    fetchKey,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      revalidateOnMount: true,
    }
  );

  return {
    conversations: data || initialData,
    isLoading,
    error: error || null,
    mutate,
  };
}
