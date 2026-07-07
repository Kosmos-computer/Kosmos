import graphene


class Clip(graphene.ObjectType):

    start = graphene.Float()
    end = graphene.Float()
    snippet = graphene.String()
    context = graphene.String()
    score = graphene.Float()
    origin = graphene.String()
    url_slug = graphene.String()
    guid = graphene.ID()
    title = graphene.String()
    clip_gen_point_time = graphene.Float()

    @staticmethod
    def convert(db_podcast_episode_preview):
        return Clip(
            start=db_podcast_episode_preview.start,
            end=db_podcast_episode_preview.end,
            snippet=db_podcast_episode_preview.highlight,
            context='',
            score=db_podcast_episode_preview.score,
            origin=db_podcast_episode_preview.type,
            url_slug=f"_H_{db_podcast_episode_preview.id}_",
            guid=db_podcast_episode_preview.guid,
            title=db_podcast_episode_preview.title,
            clip_gen_point_time=db_podcast_episode_preview.clip_gen_point_time
        )
