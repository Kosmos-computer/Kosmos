import app
from modules import *

from fastapi import APIRouter, Header, HTTPException, Request
from typing import Optional, List
from sse_starlette.sse import EventSourceResponse

from pydantic import BaseModel, Field
from typing import Optional, List

import time
import datetime
import requests
import asyncio
import sentry_sdk
import openai
import json
from typing import Union

router = APIRouter()

class Prompt(BaseModel):
    id: Optional[str] = Field(
        description="The ID of the prompt."
    )
    name: str = Field(
        description="The displayed name of the prompt."
    )
    prompt: str = Field(
        description="The content of the prompt."
    )
    @staticmethod
    def from_podium_ai_prompt(podium_ai_prompt):
        return Prompt(
            id=podium_ai_prompt.guid,
            name=podium_ai_prompt.name,
            prompt=podium_ai_prompt.prompt,
        )

class PromptList(BaseModel):
    prompts: List[Prompt] = Field(
        description="The list of prompts.",
    )

@router.get('/api/podium/v1/gpt/stream_response/{guid}/{prompt}', include_in_schema=False)
async def podium_gpt(guid: str, prompt: str, request: Request, authorization: Optional[str] = Header(None)):
    """
    Stream a response from the GPT-4 engine for the given PodiumPackage and prompt.

    :param guid: The GUID of the PodiumPackage to use.
    :param prompt: The prompt to use for the GPT-4 engine.
    :param parent_guid (optional): The GUID of a PodiumPackageGeneratedDocument or PodiumPackageAsset to use as the prompt content, instead of the PodiumPackage prompt content.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
        
    return EventSourceResponse(podium_package.generate_document_stream(prompt))



@router.get('/api/podium/v1/gpt/prompt/{guid}', response_model=PromptList, include_in_schema=False)
async def get_podium_gpt_prompts(guid: str, request: Request, authorization: Optional[str] = Header(None)) -> PromptList:
    """
    Return all prompts for the current user.
   
    :param guid: The GUID of the PodiumPackage to use for identifying the current user.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
    
    results = app.core.data_models.PodiumAiPrompt.where('podium_user_id', podium_package.user_id).get()

    return PromptList(
        prompts=[Prompt.from_podium_ai_prompt(prompt) for prompt in results]
    )

@router.post('/api/podium/v1/gpt/prompt/{guid}', response_model=Prompt, include_in_schema=False)
async def add_podium_gpt_prompt(guid: str, prompt_params: Prompt, request: Request, authorization: Optional[str] = Header(None)) -> Prompt:
    """
    Creates a new prompt for the current user.
   
    :param guid: The GUID of the PodiumPackage to use for identifying the current user.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
    
    result = app.core.data_models.PodiumAiPrompt()
    result.podium_user_id = podium_package.user_id
    result.name = prompt_params.name
    result.prompt = prompt_params.prompt
    result.save()
    result = result.fresh()

    return Prompt.from_podium_ai_prompt(result)

@router.post('/api/podium/v1/gpt/prompt/{guid}/{prompt_id}', response_model=Prompt, include_in_schema=False)
async def update_podium_gpt_prompt(guid: str, prompt_id: str, prompt_params: Prompt, request: Request, authorization: Optional[str] = Header(None)) -> Prompt:
    """
    Deletes the prompt with the given id.
   
    :param guid: The GUID of the PodiumPackage to use for identifying the current user.
    :param prompt_id: The ID of the prompt to delete.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
    
    prompt = app.core.data_models.PodiumAiPrompt.where('podium_user_id', podium_package.user_id).where('guid', prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    prompt.name = prompt_params.name
    prompt.prompt = prompt_params.prompt
    prompt.save()
    
    return Prompt.from_podium_ai_prompt(prompt)

@router.delete('/api/podium/v1/gpt/prompt/{guid}/{prompt_id}', include_in_schema=False)
async def delete_podium_gpt_prompt(guid: str, prompt_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """
    Deletes the prompt with the given id.
   
    :param guid: The GUID of the PodiumPackage to use for identifying the current user.
    :param prompt_id: The GUID of the prompt to delete.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
    
    prompt = app.core.data_models.PodiumAiPrompt.where('podium_user_id', podium_package.user_id).where('guid', prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    prompt.delete()
    
    return None

@router.post('/api/podium/v1/gpt/document/{guid}/{document_id}/accept_variant', include_in_schema=False)
async def accept_podium_gpt_document_variant(guid: str, document_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """
    Marks the given document as the accepted variant, and all other related documents as not.
   
    :param guid: The GUID of the PodiumPackage to use for identifying the current user.
    :param document_id: The GUID of the PodiumPackageAsset representing the document or the GUID of the PodiumPackageGeneratedDocument.
    """
    podium_package = app.core.data_models.PodiumPackage.where('guid', guid).first()
    if not podium_package:
        raise HTTPException(status_code=404, detail="Podium Package not found")
    
    # Try looking for a PodiumPackageAsset first
    asset = app.core.data_models.PodiumPackageAsset.where('guid', document_id).first()
    if asset is None:
        # Try looking for a PodiumPackageGeneratedDocument
        document = app.core.data_models.PodiumPackageGeneratedDocument.where('guid', document_id).first()
        if document is not None:
            asset = app.core.data_models.PodiumPackageAsset.where('podium_package_generated_document_id', document.id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Document asset not found")
    
    with app.core.database.db.transaction():
        relatives = []

        if asset.parent_id is None:
            # Document is parent, get all children
            relatives.extend(app.core.data_models.PodiumPackageAsset.where('parent_id', asset.id).get())
            
        else:
            # Document has parent, get siblings and parent
            relatives.extend(app.core.data_models.PodiumPackageAsset.where('parent_id', asset.parent_id).get())
            relatives.append(app.core.data_models.PodiumPackageAsset.where('id', asset.parent_id).first())
            
        # Mark relatives as not accepted
        for relative in relatives:
            if relative.id != asset.id:
                relative.accepted_variant = False
                relative.save()

        # Mark document as accepted
        asset.accepted_variant = True
        asset.save()
    
    return None