import { useState, useCallback, useEffect } from "react";
import * as apiClient from "../api/client";
import { useApi } from "@/shared/lib/hooks/useApi";

export interface AIAssistantMessage {
  id?: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

interface UseAIAssistantOptions {
  conversationId?: string;
  initialMessages?: AIAssistantMessage[];
  userId?: string;
  onError?: (error: string) => void;
  autoInitialize?: boolean;
}

interface UseAIAssistantReturn {
  messages: AIAssistantMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  conversationId: string | null;
  resetConversation: () => void;
}

export function useAIAssistant({
  conversationId: initialConversationId,
  initialMessages = [],
  userId,
  onError,
  autoInitialize = false,
}: UseAIAssistantOptions = {}): UseAIAssistantReturn {
  const [messages, setMessages] =
    useState<AIAssistantMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const api = useApi();

  const handleError = useCallback(
    (err: unknown) => {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
      onError?.(errorMsg);
      return errorMsg;
    },
    [onError]
  );

  // Initialize conversation if needed
  useEffect(() => {
    if (
      autoInitialize &&
      userId &&
      !conversationId &&
      messages.length === 0 &&
      api
    ) {
      initializeConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitialize, userId, conversationId, api]);

  // Initialize existing conversation data if conversation ID is provided
  useEffect(() => {
    if (initialConversationId && messages.length === 0 && api) {
      fetchConversation(initialConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, api]);

  const initializeConversation = useCallback(async () => {
    if (!userId || !api) return;

    try {
      setIsLoading(true);
      const initialMessagesFormatted = initialMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const conversation = await apiClient.createConversation(
        api,
        userId,
        undefined,
        {},
        initialMessagesFormatted
      );

      setConversationId(conversation.id);
      if (conversation.messages.length > 0) {
        setMessages(
          conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, initialMessages, handleError, api]);

  const fetchConversation = useCallback(
    async (id: string) => {
      if (!api) return;

      try {
        setIsLoading(true);
        const conversation = await apiClient.getConversation(api, id);
        setConversationId(conversation.id);
        setMessages(
          conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setError(null);
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, api]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!api) return;

      try {
        setIsLoading(true);
        setError(null);

        // Add user message to state immediately for responsive UI
        const userMessage: AIAssistantMessage = {
          role: "user",
          content,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Add a temporary loading message from assistant
        const tempAssistantMessage: AIAssistantMessage = {
          role: "assistant",
          content: "",
          metadata: { isLoading: true },
        };

        setMessages((prev) => [...prev, tempAssistantMessage]);

        // Send the message to the API
        const response = await apiClient.sendChatMessage(
          api,
          content,
          conversationId || undefined,
          false
        );

        // Update conversation ID if it was created in this request
        if (response.conversation_id && !conversationId) {
          setConversationId(response.conversation_id);
        }

        // Handle error in response
        if (response.error) {
          handleError(response.error);

          // Remove the temporary loading message
          setMessages((prev) => prev.filter((msg) => !msg.metadata?.isLoading));
          return;
        }

        // Replace the temporary message with the actual response
        setMessages((prev) => {
          const newMessages = [...prev];
          const loadingIndex = newMessages.findIndex(
            (msg) => msg.metadata?.isLoading
          );

          if (loadingIndex !== -1) {
            newMessages[loadingIndex] = {
              role: "assistant",
              content: response.message || "",
            };
          }

          return newMessages;
        });
      } catch (err) {
        handleError(err);

        // Remove the temporary loading message on error
        setMessages((prev) => prev.filter((msg) => !msg.metadata?.isLoading));
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, handleError, api]
  );

  const resetConversation = useCallback(() => {
    setMessages(initialMessages);
    setConversationId(null);
    setError(null);
    if (autoInitialize && userId && api) {
      initializeConversation();
    }
  }, [initialMessages, autoInitialize, userId, initializeConversation, api]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    conversationId,
    resetConversation,
  };
}
