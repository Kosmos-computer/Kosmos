import fathom_core as core
from .podcast import Podcast

from orator import Model
from os import system

class ExternalPodcastIndexPodcast(Model):
    
    DB_URL = "https://public.podcastindex.org/podcastindex_feeds.db.tgz"

    TEMP_DIR = "./tmp/podcastindex"

    # Only export the columns we need; for speed and in case the sqlite schema changes
    DB_EXPORT_COLUMNS = 'url, title, imageUrl, itunesId, popularityScore, dead, newestItemPubDate, itunesAuthor'
  
    # Import columns in their fathom podcast flavor
    DB_IMPORT_COLUMNS = 'rss_url, title, rss_image_url, itunes_id, podcast_index_popularity_score, dead, newest_item_pub_date, author'

    @classmethod
    def log(self, message):
        core.log.info(f"{self.__name__}: {message}")

    @classmethod
    def extract_transform_load(self):
        # Extract
        self.import_from_podcastindex()

        # Transform
        self.fill_keys()
        self.deduplicate()
        self.normalize_popularity()

        # Load
        self.update_fathom_podcasts()
        self.insert_new_fathom_podcasts()

    @classmethod
    def import_from_podcastindex(self):
        """
        Downloads the podcasts database from https://public.podcastindex.org and imports them into our database
        """

        if system("which sqlite3") != 0:
            raise Exception('ExternalPodcastIndexPodcast requires sqlite3 to be installed at the OS level!')

        system(f"mkdir -p {self.TEMP_DIR}")

        self.log("Downloading...")
        system(f"curl -s {self.DB_URL} --output {self.TEMP_DIR}/podcastindex_feeds.db.tgz")

        self.log("Extracting...")
        system(f"tar xvfz {self.TEMP_DIR}/podcastindex_feeds.db.tgz -C {self.TEMP_DIR}")

        self.log("Exporting...")
        system(f"sqlite3 -csv {self.TEMP_DIR}/podcastindex_feeds.db \"select {self.DB_EXPORT_COLUMNS} from podcasts where itunesId is not null and itunesID <> '';\" > {self.TEMP_DIR}/podcasts.csv")

        self.log("Importing...")
        target_table = self().get_table()
        load_table = f"{target_table}__load"

        core.database.db.statement(f"drop table if exists {load_table};")
        core.database.db.statement(f"select * into {load_table} from {target_table} limit 0;")

        # Use \copy psql command for fastest loading
        # Reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.Copy.html
        copy_command = f"\copy {load_table} ({self.DB_IMPORT_COLUMNS}) from '{self.TEMP_DIR}/podcasts.csv' with csv"
        psql_command = f"psql {core.env['fathom_main_db']} -c \"{copy_command}\""
        exit_code = system(psql_command)
        if exit_code != 0:
            raise Exception('Failed to load podcastindex data from CSV!')

        with core.database.db.transaction():
            core.database.db.statement(f"truncate {target_table};")
            count = core.database.db.update(f"""
                insert into {target_table} ({self.DB_IMPORT_COLUMNS})
                select {self.DB_IMPORT_COLUMNS}
                from {load_table};
            """)
            core.database.db.statement(f"drop table {load_table};")

            self.log(f"Imported {count} podcasts")

        self.log("Cleaning up temp files...")
        system(f"rm -rf {self.TEMP_DIR}")

    @classmethod
    def fill_keys(self):
        """
        Updates the _key column for all rows, to make subsequent transforms performant.
        Can take up to 30 mins to complete.
        """

        table = self().get_table()

        self.log("Filling keys...")
        core.database.db.update(f"update {table} set _key = upper(rss_url) where title = '' or author = '';")
        core.database.db.update(f"update {table} set _key = concat(upper(title), upper(author)) where title != '' and author != '';")

    @classmethod
    def deduplicate(self):
        """
        Removes duplicate podcasts by their _key, preferring popular podcasts with recent content.
        Can take up to 30 mins to complete.
        """

        table = self().get_table()

        conditions_in_order = [
            "a.podcast_index_popularity_score < b.podcast_index_popularity_score",
            "a.newest_item_pub_date < b.newest_item_pub_date",
            "a.id < b.id"
        ]

        self.log("Removing duplicates...")
        for condition in conditions_in_order:
            count = core.database.db.update(f"""
                delete from
                    {table} a
                    using {table} b
                where
                    {condition}
                    and a._key = b._key
                    and a._key is not null;
            """)

            self.log(f"Removed {count} duplicates")

    @classmethod
    def normalize_popularity(self):
        """
        Updates popularity to max out at 5
        """

        self.log("Normalizing popularity...")
        table = self().get_table()
        
        count = core.database.db.update(f"""
            update {table} 
            set podcast_index_popularity_score = 5
            where podcast_index_popularity_score > 5;
        """)

        self.log(f"Normalized popularity for {count} podcasts")


    @classmethod
    def update_fathom_podcasts(self):
        """
        Updates certain fields on fathom podcasts, such as podcast_index_popularity_score
        """

        self.log("Updating fathom podcasts...")
        source_table = self().get_table()
        target_table = Podcast().get_table()

        count = core.database.db.update(f"""
            update {target_table} as a
                set podcast_index_popularity_score = b.podcast_index_popularity_score
            from {source_table} as b
                where upper(a.rss_url) = upper(b.rss_url)
                and a.podcast_index_popularity_score != b.podcast_index_popularity_score
        """)

        self.log(f"Updated {count} fathom podcasts")
    
    @classmethod
    def insert_new_fathom_podcasts(self):
        """
        Inserts new podcasts into the fathom podcasts table
        """

        self.log("Inserting new fathom podcasts...")
        source_table = self().get_table()
        target_table = Podcast().get_table()

        count = core.database.db.update(f"""
            insert into {target_table} (
                rss_url, 
                title, 
                itunes_id, 
                rss_image_url, 
                podcast_index_popularity_score,
                author
            )
            select 
                rss_url, 
                title, 
                itunes_id, 
                rss_image_url, 
                podcast_index_popularity_score,
                author
            from {source_table}
                where dead = '0'
                and _key not in (select concat(upper(title), upper(author)) from {target_table} where title is not null and author is not null)
                and _key not in (select upper(rss_url) from {target_table} where rss_url is not null)
                and rss_url not in (select rss_url from {target_table} where rss_url is not null);
        """)

        self.log(f"Inserted {count} new fathom podcasts")
