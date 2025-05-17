import json
from typing import Any, Dict, List, Optional, Union

from keep.api.models.ai_assistant import (
    ConversationCreateDto,
    MessageCreateDto,
    MessageRole,
)


def create_system_prompt(context: Dict[str, Any] = None) -> str:
    """
    Create a system prompt based on the provided context.

    Args:
        context: Optional dictionary with context information

    Returns:
        A formatted system prompt string
    """
    base_prompt = """
    You are an AI assistant for Keep, an alert management platform.
    You help users manage, understand, and resolve alerts and incidents.

    Keep allows users to:
    1. Monitor and manage alerts from various sources
    2. Create and track incidents
    3. Set up workflows for alert handling
    4. Analyze patterns and root causes of incidents

    Be concise, helpful, and accurate. If you don't know something, say so rather than making up information.
    """

    if not context:
        return base_prompt

    # Add context-specific information
    context_str = "\n\nCurrent context:\n"

    if "user" in context:
        context_str += f"- User: {context['user']}\n"

    if "incident" in context:
        incident = context["incident"]
        context_str += f"- Current incident: {incident.get('name', 'N/A')} (ID: {incident.get('id', 'N/A')})\n"
        if "summary" in incident:
            context_str += f"  Summary: {incident['summary']}\n"

    if "alerts" in context:
        alerts = context["alerts"]
        context_str += f"- Related alerts: {len(alerts)} alerts\n"

    return base_prompt + context_str


def format_conversation_for_storage(
    messages: List[Dict[str, str]],
    context: Optional[Dict] = None,
) -> ConversationCreateDto:
    """
    Format conversation data for storage in the database.

    Args:
        messages: List of message dictionaries with 'role' and 'content'
        context: Optional context information

    Returns:
        A ConversationCreateDto object ready for database storage
    """
    # Extract potential title from first user message
    title = None
    for msg in messages:
        if msg["role"] == "user":
            # Use first 50 chars of first user message as title
            title = msg["content"][:50] + ("..." if len(msg["content"]) > 50 else "")
            break

    # Convert to MessageCreate objects
    message_objects = []
    for msg in messages:
        role = (
            MessageRole.USER
            if msg["role"] == "user"
            else (
                MessageRole.ASSISTANT
                if msg["role"] == "assistant"
                else MessageRole.SYSTEM
            )
        )
        message_objects.append(MessageCreateDto(content=msg["content"], role=role))

    return ConversationCreateDto(title=title, context=context, messages=message_objects)


def prepare_sse_message(data: Union[str, Dict], event: Optional[str] = None) -> str:
    """
    Prepare a Server-Sent Event (SSE) message.

    Args:
        data: The data to send (string or JSON-serializable dict)
        event: Optional event name

    Returns:
        Formatted SSE message string
    """
    message = []

    # Add event if provided
    if event:
        message.append(f"event: {event}")

    # Add data (serialize if dict)
    if isinstance(data, dict):
        message.append(f"data: {json.dumps(data)}")
    else:
        message.append(f"data: {data}")

    # Add empty line to end message
    message.append("")
    message.append("")

    return "\n".join(message)
