import logging
import os
from typing import AsyncGenerator, Dict, List, Union

from openai import AsyncOpenAI
from pydantic import UUID4

from keep.api.core.db import (
    add_ai_assistant_message,
    create_ai_assistant_conversation,
    get_ai_assistant_conversation,
    get_ai_assistant_messages,
    get_all_ai_assistant_conversations,
    update_ai_assistant_conversation,
)
from keep.api.models.ai_assistant import (
    ConversationCreateDto,
    ConversationReadDto,
    ConversationUpdateDto,
    MessageCreateDto,
    MessageReadDto,
    MessageRole,
)

logger = logging.getLogger(__name__)

try:
    client = AsyncOpenAI(
        api_key=os.environ.get("OPENAI_API_KEY") or os.environ.get("OPEN_AI_API_KEY")
    )
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {e}")
    client = None


class AIAssistantService:
    """Service for AI Assistant operations including LLM interactions."""

    def get_all_conversations(
        self, tenant_id: str, user_email: str
    ) -> List[ConversationReadDto]:
        """Get all conversations for a user."""
        try:
            conversations = get_all_ai_assistant_conversations(
                tenant_id=tenant_id, user_email=user_email
            )
            return [
                ConversationReadDto(**conversation.model_dump())
                for conversation in conversations
            ]
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            raise

    def get_conversation(
        self, tenant_id: str, user_email: str, conversation_id: UUID4
    ) -> ConversationReadDto:
        """Get a conversation by ID."""
        try:
            conversation = get_ai_assistant_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
            )
            messages = get_ai_assistant_messages(conversation_id=conversation_id)

            return ConversationReadDto(
                id=conversation.id,
                title=conversation.title,
                user_id=conversation.user_id,
                context=conversation.context,
                metadata=conversation.conversation_metadata,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
                messages=[
                    MessageReadDto(
                        id=msg["id"],
                        content=msg["content"],
                        role=msg["role"],
                        conversation_id=conversation_id,
                        metadata=msg["metadata"],
                        created_at=msg["created_at"],
                        updated_at=msg["updated_at"],
                    )
                    for msg in messages
                ],
            )
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            raise

    def create_conversation(
        self, tenant_id: str, user_email: str, conversation_dto: ConversationCreateDto
    ) -> ConversationReadDto:
        """Create a new conversation."""
        try:
            initial_messages = None
            if conversation_dto.messages:
                initial_messages = [
                    {"role": msg.role, "content": msg.content}
                    for msg in conversation_dto.messages
                ]

            conversation = create_ai_assistant_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                title=conversation_dto.title,
                context=conversation_dto.context,
                metadata=conversation_dto.metadata,
                initial_messages=initial_messages,
            )
            return self.get_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation.id,
            )
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise

    def update_conversation(
        self,
        tenant_id: str,
        user_email: str,
        conversation_id: UUID4,
        conversation_dto: ConversationUpdateDto,
    ) -> ConversationReadDto:
        """Update a conversation."""
        try:
            update_dict = conversation_dto.model_dump(exclude_unset=True)
            update_ai_assistant_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
                update_data=update_dict,
            )
            return self.get_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
            )
        except Exception as e:
            logger.error(f"Error updating conversation: {e}")
            raise

    def add_message(
        self,
        tenant_id: str,
        user_email: str,
        conversation_id: UUID4,
        message_dto: MessageCreateDto,
    ) -> MessageReadDto:
        """Add a message to a conversation."""
        try:
            message = add_ai_assistant_message(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
                content=message_dto.content,
                role=message_dto.role,
                metadata=message_dto.metadata,
            )
            return MessageReadDto(
                id=message.id,
                content=message.content,
                role=message.role,
                conversation_id=message.conversation_id,
                metadata=message.message_metadata,
                created_at=message.created_at,
                updated_at=message.updated_at,
            )
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise

    def get_chat_history(self, conversation_id: UUID4) -> List[Dict]:
        """Get the chat history in OpenAI format."""
        messages = get_ai_assistant_messages(conversation_id=conversation_id)
        return [{"role": msg["role"], "content": msg["content"]} for msg in messages]

    async def generate_response(
        self,
        tenant_id: str,
        user_email: str,
        conversation_id: UUID4,
        message: str,
        stream: bool = False,
    ) -> Union[str, AsyncGenerator[str, None]]:
        """Generate a response from the AI model."""
        if not client:
            error_message = "OpenAI client is not initialized. Check your API keys."
            logger.error(error_message)
            return error_message

        try:
            self.add_message(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
                message_dto=MessageCreateDto(content=message, role=MessageRole.USER),
            )
            messages = self.get_chat_history(conversation_id=conversation_id)

            if stream:
                return self._stream_response(
                    tenant_id=tenant_id,
                    user_email=user_email,
                    conversation_id=conversation_id,
                    messages=messages,
                )
            else:
                return await self._generate_complete_response(
                    tenant_id=tenant_id,
                    user_email=user_email,
                    conversation_id=conversation_id,
                    messages=messages,
                )
        except Exception as e:
            error_message = f"Error generating response: {e}"
            logger.error(error_message)
            return error_message

    async def _generate_complete_response(
        self,
        tenant_id: str,
        user_email: str,
        conversation_id: UUID4,
        messages: List[Dict],
    ) -> str:
        """Generate a complete response from the AI model."""
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )
            assistant_message = response.choices[0].message.content
            self.add_message(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
                message_dto=MessageCreateDto(
                    content=assistant_message, role=MessageRole.ASSISTANT
                ),
            )
            return assistant_message
        except Exception as e:
            logger.error(f"Error in _generate_complete_response: {e}")
            raise

    async def _stream_response(
        self,
        tenant_id: str,
        user_email: str,
        conversation_id: UUID4,
        messages: List[Dict],
    ) -> AsyncGenerator[str, None]:
        """Stream a response from the AI model."""
        try:
            stream = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True,
            )
            full_response = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content
            if full_response:
                self.add_message(
                    tenant_id=tenant_id,
                    user_email=user_email,
                    conversation_id=conversation_id,
                    message_dto=MessageCreateDto(
                        content=full_response, role=MessageRole.ASSISTANT
                    ),
                )
        except Exception as e:
            logger.error(f"Error while streaming response: {e}")
            error_msg = f"Error: {str(e)}"
            yield error_msg


# Singleton instance
ai_service = AIAssistantService()
