import fathom_core as core
from orator import Model
from orator.orm import has_one, belongs_to, has_many, has_many_through
import json

class PodiumPackageAsset(Model):
    
    @belongs_to
    def podium_package(self):
        return PodiumPackage

    @has_many('parent_id', 'id')
    def podium_package_assets(self):
        return PodiumPackageAsset.order_by('id', 'desc')
    
    @belongs_to
    def podium_package_chapter(self):
        return PodiumPackageChapter
    
    @belongs_to
    def podium_package_preview(self):
        return PodiumPackagePreview

    @belongs_to
    def podium_package_generated_document(self):
        return PodiumPackageGeneratedDocument
    
    def generate_tuning_stream(self, prompt, content):
        # add a period to the end of the prompt if it doesn't already have one
        if prompt[-1] != ".":
            prompt += "."

        composed_prompt = f"""
[start content]
{content}
[end content]

Return the content above (without delimiters) with the following instructions applied: {prompt.strip()}

Be sure to write in the language of the content (unless otherwise specified).
"""
        token_count = core.text.count_number_of_tokens(composed_prompt, model='gpt-4o')
        max_tokens = int(8150 - token_count)

        if max_tokens > 2048:
            max_tokens = 2048

        tuned_content_parts = []
        for chunk in core.inference.gpt_chat_api_single_prompt_stream(composed_prompt, 'gpt-4o', max_tokens=max_tokens, temperature=1.2, top_p=0.8):
            if 'content' in chunk['choices'][0]['delta']:
                tuned_content_parts.append(chunk['choices'][0]['delta']['content'])
            yield json.dumps(chunk)

        print("TUNED CONTENT PARTS", tuned_content_parts)
        yield '{FINISHED}'
    
    @staticmethod
    def upsert_from_generated_document(generated_document):
        generated_document = generated_document.fresh()
        # find existing asset
        asset = PodiumPackageAsset.where('podium_package_generated_document_id', generated_document.id).first()
        if asset:
            asset.title = generated_document.prompt
            asset.content = generated_document.document
            asset.save()
            return asset
        else:
            asset = PodiumPackageAsset()
            asset.podium_package_id = generated_document.podium_package_id
            asset.podium_package_generated_document_id = generated_document.id
            asset.accepted_variant = True
            if generated_document.parent_id:
                parent_asset = PodiumPackageAsset.where('podium_package_generated_document_id', generated_document.parent_id).first()
                if parent_asset:
                    asset.parent_id = parent_asset.id
                    asset.accepted_variant = False # Until user accepts the variant over the parent
            asset.type = "document"
            asset.format = "text"
            asset.title = generated_document.prompt
            asset.content = generated_document.document
            asset.save()

            asset = asset.fresh()
            return asset
    
    @staticmethod
    def upsert_from_preview(preview):
        preview = preview.fresh()
        
        # skip if no title
        if preview.title is None or preview.title == "":
            return None
        
        # find existing asset
        asset = PodiumPackageAsset.where('podium_package_preview_id', preview.id).first()
        if asset:
            asset.title = preview.title
            asset.start_seconds = preview.start
            asset.end_seconds = preview.end
            asset.save()
            return asset
        else:
            asset = PodiumPackageAsset()
            asset.podium_package_id = preview.podium_package_id
            asset.podium_package_preview_id = preview.id
            asset.type = "highlight"
            asset.format = "text_timestamped"
            asset.accepted_variant = True
            asset.title = preview.title
            asset.content = None
            asset.start_seconds = preview.start
            asset.end_seconds = preview.end
            asset.save()

            asset = asset.fresh()
            return asset
    
    @staticmethod
    def upsert_from_chapter(chapter):
        chapter = chapter.fresh()
        # find existing asset
        asset = PodiumPackageAsset.where('podium_package_chapter_id', chapter.id).first()
        if asset:
            asset.title = chapter.description
            asset.content = chapter.summary
            asset.start_seconds = chapter.start
            asset.end_seconds = chapter.end
            asset.save()
            return asset
        else:

            asset = PodiumPackageAsset()
            asset.podium_package_id = chapter.podium_package_id
            asset.podium_package_chapter_id = chapter.id
            asset.type = "chapter"
            asset.format = "text_timestamped"
            asset.accepted_variant = True
            asset.title = chapter.description
            asset.content = chapter.summary
            asset.start_seconds = chapter.start
            asset.end_seconds = chapter.end
            asset.save()

            asset = asset.fresh()
            return asset

from .podium_package import PodiumPackage
from .podium_package_chapter import PodiumPackageChapter
from .podium_package_preview import PodiumPackagePreview
from .podium_package_generated_document import PodiumPackageGeneratedDocument
