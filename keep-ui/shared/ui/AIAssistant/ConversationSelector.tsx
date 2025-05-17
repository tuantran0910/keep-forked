import React, { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Conversation } from "@/entities/ai-assistant/api/client";
import { formatDistanceToNow } from "date-fns";
import "./AIAssistantStyles.css";

export interface ConversationSelectorProps {
  conversations: Conversation[];
  isLoading: boolean;
  onSelect: (conversationId: string) => void;
  onClose: () => void;
  currentConversationId?: string;
}

function groupConversationsByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  oneMonthAgo.setHours(0, 0, 0, 0);

  return {
    today: conversations.filter((conv) => {
      const date = new Date(conv.updated_at || conv.created_at || new Date());
      return date >= today;
    }),
    yesterday: conversations.filter((conv) => {
      const date = new Date(conv.updated_at || conv.created_at || new Date());
      return date >= yesterday && date < today;
    }),
    previous7days: conversations.filter((conv) => {
      const date = new Date(conv.updated_at || conv.created_at || new Date());
      return date >= oneWeekAgo && date < yesterday;
    }),
    previous30days: conversations.filter((conv) => {
      const date = new Date(conv.updated_at || conv.created_at || new Date());
      return date >= oneMonthAgo && date < oneWeekAgo;
    }),
    older: conversations.filter((conv) => {
      const date = new Date(conv.updated_at || conv.created_at || new Date());
      return date < oneMonthAgo;
    }),
  };
}

export function ConversationSelector({
  conversations,
  isLoading,
  onSelect,
  onClose,
  currentConversationId,
}: ConversationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title && conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Flatten grouped conversations for keyboard navigation
  const flattenedConversations = [
    ...groupConversationsByDate(filteredConversations).today,
    ...groupConversationsByDate(filteredConversations).yesterday,
    ...groupConversationsByDate(filteredConversations).previous7days,
    ...groupConversationsByDate(filteredConversations).previous30days,
    ...groupConversationsByDate(filteredConversations).older,
  ];

  useEffect(() => {
    // Focus search input when component mounts
    searchInputRef.current?.focus();

    // Close selector when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!flattenedConversations.length) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((prev) =>
            prev < flattenedConversations.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          if (activeIndex >= 0 && activeIndex < flattenedConversations.length) {
            onSelect(flattenedConversations[activeIndex].id);
          }
          break;
        case "Escape":
          onClose();
          break;
        default:
          break;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, flattenedConversations, activeIndex, onSelect]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex]);

  // Reset refs array when conversations change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, flattenedConversations.length);
  }, [flattenedConversations]);

  // Group conversations by date
  const groupedConversations = groupConversationsByDate(filteredConversations);

  // Find global index for a conversation (for keyboard navigation)
  const getGlobalIndex = (conversation: Conversation): number => {
    return flattenedConversations.findIndex((c) => c.id === conversation.id);
  };

  const renderConversationItem = (conversation: Conversation) => {
    const isActive = conversation.id === currentConversationId;
    const date = new Date(
      conversation.updated_at || conversation.created_at || new Date()
    );
    const globalIndex = getGlobalIndex(conversation);
    const isKeyboardActive = globalIndex === activeIndex;

    return (
      <div
        key={conversation.id}
        ref={(el) => {
          if (globalIndex >= 0) {
            itemRefs.current[globalIndex] = el;
          }
        }}
        className={`ai-assistant-conversation-item ${
          isActive ? "ai-assistant-conversation-item-active" : ""
        } ${
          isKeyboardActive
            ? "ai-assistant-conversation-item-keyboard-active"
            : ""
        }`}
        onClick={() => onSelect(conversation.id)}
        onMouseEnter={() => setActiveIndex(globalIndex)}
        role="option"
        aria-selected={isActive || isKeyboardActive}
        tabIndex={0}
      >
        <div className="ai-assistant-conversation-item-title">
          {conversation.title || "New chat"}
        </div>
        <div className="ai-assistant-conversation-item-time">
          {formatDistanceToNow(date, { addSuffix: true })}
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    sectionConversations: Conversation[]
  ) => {
    if (sectionConversations.length === 0) return null;

    return (
      <div key={title} className="ai-assistant-conversation-section">
        <div className="ai-assistant-conversation-section-title">{title}</div>
        {sectionConversations.map(renderConversationItem)}
      </div>
    );
  };

  return (
    <>
      <div
        className="ai-assistant-conversation-selector-backdrop"
        onClick={onClose}
      ></div>
      <div
        className="ai-assistant-conversation-selector"
        ref={containerRef}
        role="listbox"
        aria-label="Conversation selector"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-assistant-conversation-selector-header">
          <div className="ai-assistant-conversation-selector-search">
            <MagnifyingGlassIcon className="ai-assistant-search-icon" />
            <input
              ref={searchInputRef}
              id="ai-assistant-conversation-search"
              name="conversation-search"
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(-1); // Reset active index when searching
              }}
              className="ai-assistant-search-input"
              aria-label="Search conversations"
              onKeyDown={(e) => {
                // Prevent arrow keys from moving cursor in text input
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                }
              }}
            />
            {searchQuery && (
              <button
                className="ai-assistant-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="ai-assistant-conversation-list">
          {isLoading ? (
            <div className="ai-assistant-conversation-loading">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="ai-assistant-conversation-empty">
              {searchQuery
                ? "No conversations found matching your search"
                : "No conversations yet"}
            </div>
          ) : (
            <>
              {renderSection("Today", groupedConversations.today)}
              {renderSection("Yesterday", groupedConversations.yesterday)}
              {renderSection(
                "Previous 7 days",
                groupedConversations.previous7days
              )}
              {renderSection(
                "Previous 30 days",
                groupedConversations.previous30days
              )}
              {renderSection("Older", groupedConversations.older)}
            </>
          )}
        </div>
      </div>
    </>
  );
}
