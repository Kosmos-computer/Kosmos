import graphene

class PodiumProgress(graphene.ObjectType):

    audio_stored = graphene.Boolean()
    transcribed = graphene.Boolean()
    previews_generated = graphene.Boolean()
    vector_generated = graphene.Boolean()
    chapters_generated = graphene.Boolean()
    summary_generated = graphene.Boolean()
    package_generated = graphene.Boolean()
    signed_url = graphene.String()
    user_email = graphene.String()
    original_filename = graphene.String()

    @staticmethod
    def convert(db_podium_package):
        if db_podium_package == None :
            return None
        else:
            podium_progress = PodiumProgress()
            podium_progress.audio_stored = db_podium_package.lookup_process_attribute_value('audio_stored') == "true"
            podium_progress.transcribed = db_podium_package.lookup_process_attribute_value('transcribed') == "true"
            podium_progress.previews_generated = db_podium_package.lookup_process_attribute_value('previews_generated') == "true"
            podium_progress.vector_generated = db_podium_package.lookup_process_attribute_value('vector_generated') == "true"
            podium_progress.chapters_generated = db_podium_package.lookup_process_attribute_value('chapters_generated') == "true"
            podium_progress.summary_generated = db_podium_package.lookup_process_attribute_value('summary_generated') == "true"
            podium_progress.package_generated = db_podium_package.lookup_process_attribute_value('package_generated') == "true"

            podium_progress.signed_url = db_podium_package.get_signed_url()
            
            podium_progress.user_email = db_podium_package.user_email
            podium_progress.original_filename = db_podium_package.original_filename
            
            return podium_progress