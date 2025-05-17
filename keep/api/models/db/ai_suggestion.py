import enum
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from sqlmodel import JSON, Column, Field, Relationship, SQLModel, Text


class AISuggestionType(enum.Enum):
    INCIDENT_SUGGESTION = "incident_suggestion"
    SUMMARY_GENERATION = "summary_generation"
    OTHER = "other"


class AISuggestion(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id", index=True)
    user_id: str = Field(index=True)
    # the input that the user provided to the AI
    suggestion_input: Dict = Field(sa_column=Column(JSON))
    # the hash of the suggestion input to allow for duplicate suggestions with the same input
    suggestion_input_hash: str = Field(index=True)
    # the type of suggestion
    suggestion_type: AISuggestionType = Field(index=True)
    # the content of the suggestion
    suggestion_content: Dict = Field(sa_column=Column(JSON))
    # the model that was used to generate the suggestion
    model: str = Field()
    # the date and time when the suggestion was created
    created_at: datetime = Field(default_factory=datetime.utcnow)

    feedbacks: List["AIFeedback"] = Relationship(back_populates="suggestion")

    class Config:
        arbitrary_types_allowed = True


class AIFeedback(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    suggestion_id: UUID = Field(foreign_key="aisuggestion.id", index=True)
    user_id: str = Field(index=True)
    feedback_content: str = Field(sa_column=Column(JSON))
    rating: Optional[int] = Field(default=None)
    comment: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow}
    )

    suggestion: AISuggestion = Relationship(back_populates="feedbacks")

    class Config:
        arbitrary_types_allowed = True


class MessageRole(str, enum.Enum):
    """Enum for message roles in a conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(SQLModel, table=True):
    """Database model for conversations."""

    __tablename__ = "ai_assistant_conversations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id", index=True, title="Tenant ID")
    user_email: str = Field(..., title="User email", index=True)
    title: Optional[str] = Field(default=None, title="Conversation title")
    context: Optional[Dict] = Field(
        default=None, sa_column=Column(JSON), title="Conversation context"
    )
    conversation_metadata: Optional[Dict] = Field(
        default=None,
        sa_column=Column(JSON),
        title="Additional metadata",
        alias="metadata",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow}
    )

    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    """Database model for messages in a conversation."""

    __tablename__ = "ai_assistant_messages"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    content: str = Field(..., sa_column=Column(Text), title="Message content")
    role: MessageRole = Field(..., title="Message role")
    message_metadata: Optional[Dict] = Field(
        default=None,
        sa_column=Column(JSON),
        title="Additional metadata",
        alias="metadata",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow}
    )
    conversation_id: UUID = Field(
        ..., foreign_key="ai_assistant_conversations.id", title="Conversation ID"
    )

    conversation: Conversation = Relationship(back_populates="messages")
