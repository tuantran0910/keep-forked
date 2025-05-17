import logging
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import UUID4, BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from keep.api.ai_assistant.service import ai_service
from keep.api.ai_assistant.utils import (
    create_system_prompt,
    format_conversation_for_storage,
    prepare_sse_message,
)
from keep.api.models.ai_assistant import (
    ConversationCreateDto,
    ConversationReadDto,
    ConversationUpdateDto,
    MessageCreateDto,
    MessageReadDto,
)
from keep.identitymanager.authenticatedentity import AuthenticatedEntity
from keep.identitymanager.identitymanagerfactory import IdentityManagerFactory

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessageRequest(BaseModel):
    """Request model for chat messages."""

    message: str = Field(..., description="User message content")
    conversation_id: Optional[UUID4] = Field(
        None, description="Existing conversation ID"
    )
    stream: bool = Field(False, description="Whether to stream the response")


@router.get("/conversations", response_model=List[ConversationReadDto])
async def get_conversations(
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """Get all conversations for a user."""
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    logger.info(
        "Getting all conversations for user",
        extra={
            "tenant_id": tenant_id,
            "user_email": user_email,
        },
    )
    try:
        return ai_service.get_all_conversations(
            tenant_id=tenant_id, user_email=user_email
        )
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting conversations: {e}")


@router.get("/conversations/{conversation_id}", response_model=ConversationReadDto)
async def get_conversation(
    conversation_id: UUID4,
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """Get a conversation by ID."""
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    logger.info(
        "Getting conversation for user by ID",
        extra={
            "conversation_id": conversation_id,
            "tenant_id": tenant_id,
            "user_email": user_email,
        },
    )

    try:
        return ai_service.get_conversation(
            tenant_id=tenant_id, user_email=user_email, conversation_id=conversation_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting conversation: {e}")


@router.post("/conversations", response_model=ConversationReadDto)
async def create_conversation(
    conversation_dto: ConversationCreateDto = Body(...),
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """Create a new conversation."""
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    try:
        conversation = ai_service.create_conversation(
            tenant_id=tenant_id,
            user_email=user_email,
            conversation_dto=conversation_dto,
        )
        return conversation
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating conversation: {e}")


@router.patch("/conversations/{conversation_id}", response_model=ConversationReadDto)
async def update_conversation(
    conversation_id: UUID4,
    conversation_dto: ConversationUpdateDto = Body(...),
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """Update a conversation."""
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    logger.info(
        "Updating conversation for user by ID",
        extra={
            "conversation_id": conversation_id,
            "tenant_id": tenant_id,
            "user_email": user_email,
        },
    )

    try:
        return ai_service.update_conversation(
            tenant_id=tenant_id,
            user_email=user_email,
            conversation_id=conversation_id,
            conversation_dto=conversation_dto,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating conversation: {e}")


@router.post("/chat", response_model=Union[Dict[str, Any], None])
async def chat(
    req: ChatMessageRequest,
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """
    Chat with the AI Assistant.

    For non-streaming responses, returns the complete assistant response.
    For streaming responses, returns a streaming response using Server-Sent Events.
    """
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    logger.info(
        "Chatting with AI Assistant",
        extra={
            "tenant_id": tenant_id,
            "user_email": user_email,
        },
    )

    try:
        context = None
        if req.stream:
            return await _stream_chat_response(
                tenant_id=tenant_id,
                user_email=user_email,
                message=req.message,
                conversation_id=req.conversation_id,
                context=context,
            )

        conversation_id = req.conversation_id

        if not conversation_id:
            system_prompt = create_system_prompt(context=context)
            conversation_data_dict = format_conversation_for_storage(
                messages=[{"role": "system", "content": system_prompt}],
                context=context,
            )
            conversation_create_dto = ConversationCreateDto(**conversation_data_dict)
            conversation = ai_service.create_conversation(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_dto=conversation_create_dto,
            )
            conversation_id = conversation.id

        # Generate response
        assistant_response = await ai_service.generate_response(
            tenant_id=tenant_id,
            user_email=user_email,
            conversation_id=conversation_id,
            message=req.message,
            stream=False,
        )

        return {
            "conversation_id": str(conversation_id),
            "message": assistant_response,
            "context": context,
        }
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {e}")


async def _stream_chat_response(
    tenant_id: str,
    user_email: str,
    message: str,
    conversation_id: Optional[UUID4],
    context: Optional[Dict[str, Any]],
) -> StreamingResponse:
    """Stream the chat response using Server-Sent Events."""

    async def event_generator():
        """Generate events for the chat response."""
        nonlocal conversation_id

        try:
            if not conversation_id:
                system_prompt = create_system_prompt(context=context)
                conversation_data = format_conversation_for_storage(
                    messages=[{"role": "system", "content": system_prompt}],
                    context=context,
                )
                conversation_create_dto = ConversationCreateDto(**conversation_data)
                new_conversation = ai_service.create_conversation(
                    tenant_id=tenant_id,
                    user_email=user_email,
                    conversation_dto=conversation_create_dto,
                )
                conversation_id = new_conversation.id

                yield prepare_sse_message(
                    data={"conversation_id": str(conversation_id)},
                    event="conversation_created",
                )

            async for chunk in ai_service.generate_response(
                tenant_id=tenant_id,
                user_email=user_email,
                conversation_id=conversation_id,
                message=message,
                stream=True,
            ):
                yield prepare_sse_message(chunk, event="message_chunk")

            # Signal completion
            yield prepare_sse_message(
                data={"conversation_id": str(conversation_id), "complete": True},
                event="message_complete",
            )

        except Exception as e:
            logger.error(f"Error in stream_chat_response: {e}")
            yield prepare_sse_message({"error": str(e)}, event="error")

    return EventSourceResponse(event_generator())


@router.post("/conversations/{conversation_id}/messages", response_model=MessageReadDto)
async def add_message(
    conversation_id: UUID4,
    message_data: MessageCreateDto = Body(...),
    authenticated_entity: AuthenticatedEntity = Depends(
        IdentityManagerFactory.get_auth_verifier(["read:alert"])
    ),
):
    """Add a message to a conversation."""
    tenant_id = authenticated_entity.tenant_id
    user_email = authenticated_entity.email

    logger.info(
        "Adding message to conversation",
        extra={
            "conversation_id": conversation_id,
            "tenant_id": tenant_id,
            "user_email": user_email,
        },
    )

    try:
        message = ai_service.add_message(
            tenant_id=tenant_id,
            user_email=user_email,
            conversation_id=conversation_id,
            message_data=message_data,
        )
        return message
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding message: {e}")
        raise HTTPException(status_code=500, detail=f"Error adding message: {e}")
