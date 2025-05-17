from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import UUID4, BaseModel, Field


class MessageRole(str, Enum):
    """Enum for message roles in a conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageBase(BaseModel):
    """Base model for messages in a conversation."""

    content: str = Field(..., title="Message content")
    role: MessageRole = Field(..., title="Message role")
    metadata: Optional[dict] = Field(default=None, title="Additional metadata")

    class Config:
        orm_mode = True


class MessageCreateDto(MessageBase):
    """Model for creating a new message."""

    pass


class MessageReadDto(MessageBase):
    """Model for reading a message."""

    id: UUID4
    created_at: datetime
    updated_at: datetime
    conversation_id: UUID4


class ConversationBase(BaseModel):
    """Base model for conversations."""

    title: Optional[str] = Field(default=None, title="Conversation title")
    context: Optional[dict] = Field(default=None, title="Conversation context")
    metadata: Optional[dict] = Field(default=None, title="Additional metadata")

    class Config:
        orm_mode = True


class ConversationCreateDto(ConversationBase):
    """Model for creating a new conversation."""

    messages: Optional[List[MessageCreateDto]] = None


class ConversationUpdateDto(BaseModel):
    """Model for updating a conversation."""

    title: Optional[str] = None
    context: Optional[dict] = None
    metadata: Optional[dict] = None


class ConversationReadDto(ConversationBase):
    """Model for reading a conversation."""

    id: UUID4
    created_at: datetime
    updated_at: datetime
    messages: List[MessageReadDto] = []
