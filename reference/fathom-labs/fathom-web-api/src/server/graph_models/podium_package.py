import app
import graphene

from .podium_chapter import PodiumChapter
from .podium_paragraph import PodiumParagraph
from .podium_monologue import PodiumMonologue

class PodiumPackage(graphene.ObjectType):
    guid = graphene.String()
    title = graphene.String()
    original_filename = graphene.String()
    duration = graphene.Int()
    created_at = graphene.DateTime()
    error = graphene.String()
    error_type = graphene.String()
    audio_stored = graphene.Boolean()
    transcribed = graphene.Boolean()
    previews_generated = graphene.Boolean()
    vector_generated = graphene.Boolean()
    chapters_generated = graphene.Boolean()
    summary_generated = graphene.Boolean()
    package_generated = graphene.Boolean()
    user_email = graphene.String()
    signed_url= graphene.String()

    podium_chapters = graphene.List(PodiumChapter)
    podium_paragraphs = graphene.List(PodiumParagraph)
    podium_monologues = graphene.List(PodiumMonologue)
    number_of_speakers = graphene.Int()

    @staticmethod
    def convert(db_podium_package, fields=None):
        if db_podium_package == None :
            return None
        else:
            podium_package = PodiumPackage()

            podium_package.podium_chapters = []
            podium_package.podium_paragraphs = []
            podium_package.podium_monologues = []

            podium_package.guid = db_podium_package.guid
            podium_package.title = db_podium_package.title
            podium_package.user_email = db_podium_package.user_email
            podium_package.original_filename = db_podium_package.original_filename

            if podium_package.original_filename == None:
              podium_package.original_filename = db_podium_package.guid + ".mp3"

            podium_package.duration = db_podium_package.duration
            podium_package.created_at = db_podium_package.created_at
            podium_package.error = db_podium_package.error
            podium_package.error_type = db_podium_package.error_type


            podium_package.audio_stored = db_podium_package.lookup_process_attribute_value('audio_stored') == "true"
            podium_package.transcribed = db_podium_package.lookup_process_attribute_value('transcribed') == "true"
            podium_package.previews_generated = db_podium_package.lookup_process_attribute_value('previews_generated') == "true"
            podium_package.vector_generated = db_podium_package.lookup_process_attribute_value('vector_generated') == "true"
            podium_package.chapters_generated = db_podium_package.lookup_process_attribute_value('chapters_generated') == "true"
            podium_package.summary_generated = db_podium_package.lookup_process_attribute_value('summary_generated') == "true"
            podium_package.package_generated = db_podium_package.lookup_process_attribute_value('package_generated') == "true"


            if fields is None or app.query_contains(fields, "signedUrl"):
                podium_package.signed_url = db_podium_package.get_signed_url()

            if fields is None or app.query_contains(fields, "numberOfSpeakers") or app.query_contains(fields, "podiumChapters") or app.query_contains(fields, "podiumParagraphs") or app.query_contains(fields, "podiumMonologues"):
                transcript = db_podium_package.podium_package_transcript_file()
                transcript.load_content()
                transcript_json = transcript.content

            if fields is None or app.query_contains(fields, "numberOfSpeakers"):
                #podium_package.number_of_speakers = db_podium_package.get_number_of_speakers(transcript)
                if db_podium_package.guid == "8d0c1bfd-e0f4-405a-851c-4230144f1e2b":
                    podium_package.number_of_speakers = 2
                else:
                    podium_package.number_of_speakers = 1

            if fields is None or app.query_contains(fields, "podiumChapters"):
                for chapter in db_podium_package.chapters:
                    podium_chapter = PodiumChapter()
                    podium_chapter.start = chapter.start
                    podium_chapter.end = chapter.end
                    podium_chapter.description = chapter.description
                    podium_chapter.summary = chapter.summary
                    podium_package.podium_chapters.append(podium_chapter)

            if fields is None or app.query_contains(fields, "podiumParagraphs"):
                for paragraph in db_podium_package.podium_package_transcript_file().paragraphs:
                    podium_paragraph = PodiumParagraph()
                    podium_paragraph.start = paragraph.start
                    podium_paragraph.end = paragraph.end
                    podium_paragraph.content = paragraph.content
                    podium_package.podium_paragraphs.append(podium_paragraph)

            if (fields is None or app.query_contains(fields, "podiumMonologues")) and db_podium_package.guid == "8d0c1bfd-e0f4-405a-851c-4230144f1e2b": #and db_podium_package.get_number_of_speakers(transcript) > 1:
                for monologue in transcript_json['monologues']:
                    elements = [x['value'] for x in monologue['elements']]

                    monologue_text = ''.join(elements)
                    start_time = [x['start'] for x in monologue['elements'] if x['type'] == 'text'][0]

                    podium_monologue = PodiumMonologue()
                    podium_monologue.start = start_time
                    podium_monologue.speaker = monologue['speaker']
                    podium_monologue.content = monologue_text

                    podium_package.podium_monologues.append(podium_monologue)

            return podium_package
