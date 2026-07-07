import app
import graphene
from .clip import Clip

class UpsertClip(graphene.Mutation):
    class Arguments:
        podcast_episode_guid = graphene.String()
        clip_guid = graphene.String()
        title = graphene.String()
        snippet = graphene.String()
        start = graphene.Float()
        end = graphene.Float()
        clip_gen_point_time = graphene.Float()

    clip = graphene.Field(Clip)

    def mutate(root, info, title, snippet, start, end, clip_gen_point_time=None, podcast_episode_guid=None, clip_guid=None):      
        user = app.auth.get_user_from_info(info)
        
        podcast_episode = app.core.data_models.PodcastEpisode.where('guid', podcast_episode_guid).first()
        
        existing_clip = app.core.data_models.PodcastEpisodePreview \
            .query().select('id', 'guid', 'start', 'end', 'clip_gen_point_time', 'highlight', 'title', 'type', 'score', 'podcast_episode_id') \
            .where('user_id', user.id) \
            .where('guid', clip_guid) \
            .first()
        
        if existing_clip is not None:
            existing_clip.title = title
            existing_clip.highlight = snippet
            existing_clip.start = start
            existing_clip.end = end
            existing_clip.save()
            clip = Clip.convert(existing_clip)
        else:
            if podcast_episode is not None:
                podcast_episode_preview = app.core.data_models.PodcastEpisodePreview()
                podcast_episode_preview.user_id = user.id
                podcast_episode_preview.podcast_episode_id = podcast_episode.id
                podcast_episode_preview.title = title
                podcast_episode_preview.highlight = snippet
                podcast_episode_preview.start = start
                podcast_episode_preview.end = end
                podcast_episode_preview.clip_gen_point_time = clip_gen_point_time
                podcast_episode_preview.type = "user:clip"
                podcast_episode_preview.score = 0
                podcast_episode_preview.save()

                #reload the podcast_episode_preview to get the guid
                podcast_episode_preview = app.core.data_models.PodcastEpisodePreview \
                    .query().select('id', 'guid', 'start', 'end', 'clip_gen_point_time', 'highlight', 'title', 'type', 'score', 'podcast_episode_id') \
                    .where('user_id', user.id) \
                    .where('id', podcast_episode_preview.id) \
                    .first()
                clip = Clip.convert(podcast_episode_preview)
            else:
                clip = None
        
        return UpsertClip(clip=clip)
