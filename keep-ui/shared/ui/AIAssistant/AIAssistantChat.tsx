"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { AIAssistantMessage } from "./AIAssistantMessage";
import {
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import {
  useAIAssistant,
  AIAssistantMessage as AIAssistantMessageType,
} from "@/entities/ai-assistant/model/useAIAssistant";
import { useConversations } from "@/entities/ai-assistant/model/useConversations";
import { ConversationSelector } from "./ConversationSelector";
import "./AIAssistantStyles.css";

// Add extended message type with created_at
interface MessageWithTimestamp extends AIAssistantMessageType {
  created_at?: string;
}

export interface AIAssistantChatProps {
  initialMessage?: string;
  placeholder?: string;
  conversationId?: string;
  onSend?: (message: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function AIAssistantChat({
  initialMessage = "I'm your AI assistant. How can I help you?",
  placeholder = "Type your message...",
  conversationId: initialConversationId,
  onSend,
  onError,
  className = "",
}: AIAssistantChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [conversationName, setConversationName] = useState("New chat");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isClickable, setIsClickable] = useState(true);
  const conversationTitleRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    conversationId,
    resetConversation,
  } = useAIAssistant({
    conversationId: initialConversationId,
    initialMessages: initialMessage
      ? [{ role: "assistant", content: initialMessage }]
      : [],
    onError,
    autoInitialize: !initialConversationId,
  });

  // Fetch conversations for the user
  const { conversations, isLoading: isLoadingConversations } = useConversations(
    {}
  );

  // Update conversation name when messages change
  useEffect(() => {
    if (conversationId) {
      const currentConversation = conversations.find(
        (c) => c.id === conversationId
      );
      if (currentConversation && currentConversation.title) {
        setConversationName(currentConversation.title);
      } else if (messages.length > 0) {
        // If this is a new conversation not yet in the list, derive name from first user message
        const firstUserMessage = messages.find((msg) => msg.role === "user");
        if (firstUserMessage) {
          const nameFromMessage = firstUserMessage.content
            .split(" ")
            .slice(0, 5)
            .join(" ");
          setConversationName(
            nameFromMessage.length > 30
              ? nameFromMessage.substring(0, 30) + "..."
              : nameFromMessage
          );
        }
      }
    }
  }, [messages, conversationId, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Add click outside listener to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSelectorOpen &&
        conversationTitleRef.current &&
        !conversationTitleRef.current.contains(event.target as Node)
      ) {
        // Only close if clickable and the click is outside
        if (!isClickable) return;

        setIsClickable(false);
        setIsSelectorOpen(false);

        setTimeout(() => {
          setIsClickable(true);
        }, 200);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSelectorOpen, isClickable]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue("");

    if (onSend) {
      onSend(message);
    }

    await sendMessage(message);

    // Focus back on textarea after sending
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event propagation

    // Only proceed if clickable
    if (!isClickable) return;

    // Temporarily disable clicking to prevent double toggle
    setIsClickable(false);

    // Toggle the dropdown state
    setIsSelectorOpen((prev) => !prev);

    // Re-enable clicking after a short delay
    setTimeout(() => {
      setIsClickable(true);
    }, 200); // 200ms should be enough to prevent double toggling
  };

  const handleSelectConversation = async (selectedConversationId: string) => {
    if (!isClickable) return;

    setIsClickable(false);
    setIsSelectorOpen(false);

    if (selectedConversationId !== conversationId) {
      // Switch to the selected conversation
      window.location.href = `/ai-assistant?conversationId=${selectedConversationId}`;
    }

    // Re-enable clicking after a short delay
    setTimeout(() => {
      setIsClickable(true);
    }, 200);
  };

  const displayMessages =
    messages.length > 0
      ? messages
      : initialMessage
      ? [{ role: "assistant", content: initialMessage }]
      : [];

  // Generate synthetic timestamps for messages if they don't have one
  const getMessageTimestamp = (
    message: AIAssistantMessageType,
    index: number
  ) => {
    // If this is a real message with created_at
    if ((message as MessageWithTimestamp).created_at) {
      return new Date((message as MessageWithTimestamp).created_at!);
    }

    // Create synthetic timestamps, starting from now and going backwards
    // This gives messages a sensible time order
    return new Date(Date.now() - (displayMessages.length - 1 - index) * 60000);
  };

  return (
    <div className={`ai-assistant-chat ${className}`}>
      <div
        className="ai-assistant-conversation-title"
        ref={conversationTitleRef}
      >
        <div
          className="ai-assistant-conversation-title-inner"
          onClick={handleConversationTitleClick}
        >
          <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 mr-1" />
          {conversationName}
        </div>

        {isSelectorOpen && (
          <ConversationSelector
            conversations={conversations}
            isLoading={isLoadingConversations}
            onSelect={handleSelectConversation}
            onClose={() => {
              if (!isClickable) return;
              setIsClickable(false);
              setIsSelectorOpen(false);
              setTimeout(() => {
                setIsClickable(true);
              }, 200);
            }}
            currentConversationId={conversationId || undefined}
          />
        )}
      </div>

      <div className="ai-assistant-messages">
        {displayMessages.map((message, index) => (
          <AIAssistantMessage
            key={message.id || index}
            role={message.role}
            content={message.content}
            isLoading={message.metadata?.isLoading}
            timestamp={getMessageTimestamp(message, index)}
          />
        ))}

        {isLoading && displayMessages.every((m) => !m.metadata?.isLoading) && (
          <AIAssistantMessage
            role="assistant"
            content=""
            isLoading={true}
            timestamp={new Date()}
          />
        )}

        {error && (
          <div className="ai-assistant-error">
            <p>Error: {error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-assistant-input">
        <Textarea
          ref={textareaRef}
          id="ai-assistant-message-input"
          name="message"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="ai-assistant-textarea"
          disabled={isLoading}
          maxRows={5}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="ai-assistant-send-button"
          variant="primary"
          size="sm"
          aria-label="Send message"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
