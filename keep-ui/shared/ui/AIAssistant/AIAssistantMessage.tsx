"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  UserIcon,
  ClipboardIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import KeepPng from "../../../keep.png";

export interface AIAssistantMessageProps {
  role: string;
  content: string;
  isLoading?: boolean;
  metadata?: Record<string, any>;
  className?: string;
  timestamp?: Date;
}

export function AIAssistantMessage({
  role,
  content,
  isLoading = false,
  metadata,
  className = "",
  timestamp = new Date(),
}: AIAssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div
        className={`ai-assistant-message ai-assistant-message-loading ${className}`}
      >
        <div className="ai-assistant-message-header">
          <div className="ai-assistant-message-avatar ai-assistant-message-avatar-assistant">
            <Image
              src={KeepPng}
              alt="Keep AI"
              width={24}
              height={24}
              className="rounded-full"
            />
          </div>
          <div className="ai-assistant-message-name">Keep AI Assistant</div>
        </div>
        <div className="ai-assistant-message-bubble">
          <div className="ai-assistant-message-content">
            <div className="ai-assistant-loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === "user") {
    return (
      <div
        className={`ai-assistant-message ai-assistant-message-user ${className}`}
      >
        <div className="ai-assistant-message-header">
          <div className="ai-assistant-message-avatar ai-assistant-message-avatar-user">
            <div className="bg-gray-200 p-1 rounded-full">
              <UserIcon className="text-gray-600" width={16} height={16} />
            </div>
          </div>
          <div className="ai-assistant-message-name">You</div>
        </div>
        <div className="ai-assistant-message-container">
          <div className="ai-assistant-message-bubble">
            <div className="ai-assistant-message-content">
              <p>{content}</p>
            </div>
            <div className="ai-assistant-message-timestamp">
              {formatTime(timestamp)}
            </div>
          </div>
          <div className="ai-assistant-message-actions">
            <button
              onClick={handleCopy}
              className="ai-assistant-copy-button"
              aria-label="Copy message"
              title="Copy message"
            >
              <div className="ai-assistant-copy-button-inner">
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardIcon className="h-3.5 w-3.5" />
                )}
                <span className="ai-assistant-copy-text">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === "assistant" || role === "system") {
    return (
      <div
        className={`ai-assistant-message ai-assistant-message-assistant ${className}`}
      >
        <div className="ai-assistant-message-header">
          <div className="ai-assistant-message-avatar ai-assistant-message-avatar-assistant">
            <Image
              src={KeepPng}
              alt="Keep AI"
              width={24}
              height={24}
              className="rounded-full"
            />
          </div>
          <div className="ai-assistant-message-name">Keep AI Assistant</div>
        </div>
        <div className="ai-assistant-message-container">
          <div className="ai-assistant-message-bubble">
            <div className="ai-assistant-message-content">
              <div className="ai-assistant-markdown prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-pre:bg-gray-800 prose-pre:text-gray-100">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
            <div className="ai-assistant-message-timestamp">
              {formatTime(timestamp)}
            </div>
          </div>
          <div className="ai-assistant-message-actions">
            <button
              onClick={handleCopy}
              className="ai-assistant-copy-button"
              aria-label="Copy message"
              title="Copy message"
            >
              <div className="ai-assistant-copy-button-inner">
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardIcon className="h-3.5 w-3.5" />
                )}
                <span className="ai-assistant-copy-text">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default case for unexpected roles
  return (
    <div className={`ai-assistant-message ${className}`}>
      <div className="ai-assistant-message-container">
        <div className="ai-assistant-message-bubble">
          <div className="ai-assistant-message-content">
            <p>{content}</p>
          </div>
          <div className="ai-assistant-message-timestamp">
            {formatTime(timestamp)}
          </div>
        </div>
        <div className="ai-assistant-message-actions">
          <button
            onClick={handleCopy}
            className="ai-assistant-copy-button"
            aria-label="Copy message"
            title="Copy message"
          >
            <div className="ai-assistant-copy-button-inner">
              {copied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <ClipboardIcon className="h-3.5 w-3.5" />
              )}
              <span className="ai-assistant-copy-text">
                {copied ? "Copied!" : "Copy"}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
