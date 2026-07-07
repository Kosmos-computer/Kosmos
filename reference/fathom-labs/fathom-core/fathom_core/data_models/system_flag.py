from orator import Model

class SystemFlag(Model):

    __primary_key__ = 'flag_name'
    __timestamps__ = False

    FLAGS = [
        'episode_processing_enabled',
        'podcast_updating_enabled',
        'podium_processing_enabled'
    ]

    @staticmethod
    def is_active(flag_name):
        if not flag_name in SystemFlag.FLAGS:
            raise RuntimeError("Flag not implemented")

        flag = SystemFlag.where('flag_name', flag_name).first()
        if flag == None:
            raise RuntimeError("SystemFlag does not exist")

        return flag.flag_active == True

    @staticmethod
    def where_raw_is_active(flag_name):
        if not flag_name in SystemFlag.FLAGS:
            raise RuntimeError("Flag not implemented")

        return f"(select flag_active from system_flags where flag_name='{flag_name}') = true"