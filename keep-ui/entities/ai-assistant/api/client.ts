import { ApiClient } from "@/shared/api";

export interface Message {
  id: string;
  role: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  user_id: string;
  messages: Message[];
  created_at?: string;
  updated_at?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message?: string;
  error?: string;
}

export async function sendChatMessage(
  api: ApiClient,
  message: string,
  conversationId?: string,
  stream: boolean = false
): Promise<ChatResponse> {
  try {
    const response = await api.post("/ai-assistant/chat", {
      message,
      conversation_id: conversationId,
      stream,
    });

    return response;
  } catch (error) {
    console.error("Error sending chat message:", error);
    return {
      conversation_id: conversationId || "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getConversation(
  api: ApiClient,
  conversationId: string
): Promise<Conversation> {
  try {
    return await api.get(`/ai-assistant/conversations/${conversationId}`);
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
}

export async function createConversation(
  api: ApiClient,
  title?: string,
  initialMessages?: Array<{ role: string; content: string }>
): Promise<Conversation> {
  try {
    return await api.post("/ai-assistant/conversations", {
      title,
      initialMessages,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}

export async function getUserConversations(
  api: ApiClient
): Promise<Conversation[]> {
  try {
    return await api.get(`/ai-assistant/conversations`);
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
}
