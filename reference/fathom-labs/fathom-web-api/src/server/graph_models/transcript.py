import app
import graphene
from orator.query.join_clause import JoinClause

class Transcript(graphene.ObjectType):
    elements = graphene.List(graphene.String)
    starts = graphene.List(graphene.Float)

    def get_transcript_start(self):
        transcript_start = Transcript()
        
        transcript_start.elements = self.elements[:400]
        transcript_start.starts = self.starts[:400]

        return transcript_start 

    def get_transcript_highlight(self, highlight_start, highlight_end):
        transcript_highlight = Transcript()

        if highlight_start > 10:
            highlight_start -= 10
        else:
            highlight_start = 0

        if highlight_end < self.starts[len(self.starts)-1] - 10:
            highlight_end += 10
        else:
            highlight_end = self.starts[len(self.starts)-1]

        start_index = self.find_index(highlight_start, 0, len(self.starts) - 1)

        end_index = self.find_index(highlight_end, 0, len(self.starts) - 1)

        transcript_highlight.elements = self.elements[start_index:end_index]
        transcript_highlight.starts = self.starts[start_index:end_index]

        return transcript_highlight

    def find_index(self, time, start, end):
        if start == end:
            return start

        mid = (start + end) // 2

        if self.starts[mid] < time:
            return self.find_index(time, mid + 1, end)
        else:
            return self.find_index(time, start, mid)

    @staticmethod
    def convert(db_transcript):
        if db_transcript == None :
            return None
        else:
            transcript = Transcript()
            transcript.elements = db_transcript.compressed_transcript['elements']
            transcript.starts = db_transcript.compressed_transcript['starts']

            return transcript

