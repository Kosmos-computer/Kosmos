import app
import graphene
from datetime import datetime, timedelta

class FollowPodcast(graphene.Mutation):
    class Arguments:
        podcast_guid = graphene.String()
        notifications_enabled = graphene.Boolean(required=False)
    
    ok = graphene.Boolean()

    def mutate(root, info, podcast_guid, notifications_enabled=True):
        ok = None
        
        user = app.auth.get_user_from_info(info)
        
        podcast = app.core.data_models.Podcast.where('guid', podcast_guid).first()
        
        if podcast is not None and user is not None:
            
            existingFollow = app.core.data_models.UserPodcastFollow \
            .where('podcast_id', podcast.id) \
            .where('user_id', user.id) \
            .first()
            
            if existingFollow is None:
                new_follow = app.core.data_models.UserPodcastFollow()
                new_follow.user_id = user.id
                new_follow.podcast_id = podcast.id
                new_follow.notifications_enabled = notifications_enabled
                new_follow.save()
            else:
                existingFollow.notifications_enabled = notifications_enabled
                existingFollow.save()

            if podcast.processing_level <= 2:
                if podcast.follower_count() >= 10:
                    podcast.processing_level = 3
                    new_transcribe_after_date = datetime.today().date() - timedelta(days=14)
                    if podcast.transcribe_after >= new_transcribe_after_date:
                        podcast.transcribe_after = new_transcribe_after_date
                    podcast.save()
                
            ok = True
        else:
            ok = False
        
        return FollowPodcast(ok=ok)
