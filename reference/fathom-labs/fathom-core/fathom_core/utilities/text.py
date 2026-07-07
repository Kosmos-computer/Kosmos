import fathom_core as core
import spacy
import en_core_web_sm
from spacy.symbols import ORTH
import hashlib
#import pyhash
import math
import re
from titlecase import titlecase
import tiktoken

class Text():

    def __init__(self):
        self.spacy_nlp_fast = en_core_web_sm.load(disable=['tagger', 'textcat', 'ner', 'lemmatizer'])

        special_case = [{ORTH: "<inaudible>"}]
        self.spacy_nlp_fast.tokenizer.add_special_case("<inaudible>", special_case)

        self.nlp = spacy.load('en_core_web_sm')

        self.allowed_in_sentence_dots = ['Mr.', 'Mrs.', 'Dr.', 'No.', 'St.', 'Co.', 'Jr.', 'Maj.', 'Gen.', \
                        'Drs.', 'Rev.', 'Lt.', 'Hon.', 'Sgt.', 'Capt.', 'Esq.', 'Ltd.', 'Col.', 'Ft.', \
                        'Ms.', 'Messrs.', 'Prof.', 'Sen.', 'Rep.', 'Gov.', 'Pres.', 'Sens.', 'Reps.', 'Sec.', \
                        'Attys.', 'Messrs.', 'Messrs.', 'Messrs.', 'Messrs.', \
                        'etc.']

        self.gpt_encoding = tiktoken.get_encoding('p50k_base')
        self.gpt_chat_encoding = tiktoken.get_encoding('cl100k_base')

    def process(self, content):
        return self.spacy_nlp_fast(content)

    def get_sentences(self, content):
        return [sent.text for sent in self.process(content).sents]

    def get_md5_signature(self, content):
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def get_fingerprint(self, content):
        #hasher = pyhash.city_64()
        #return hasher(content.encode('utf-8')) - math.pow(2, 63)
        return 0

    def get_url_friendly(self, string):
        string = string.replace("'", '')
        string = re.sub(r'[^a-zA-Z0-9_]', '-', string)

        to_remove = "-"
        pattern = "(?P<char>[" + re.escape(to_remove) + "])(?P=char)+"
        string = re.sub(pattern, r"\1", string)

        if string[-1:] == '-':
            string = string[:-1]
        if string[:1] == '-':
            string = string[1:]

        return string.lower()

    def is_html(self, text):
        is_html = False

        if '<html' in text:
            is_html = True
        if '<body' in text:
            is_html = True
        if '<h1' in text:
            is_html = True
        if '<h2' in text:
            is_html = True
        if '<h3' in text:
            is_html = True
        if '<div' in text:
            is_html = True
        if '<p' in text:
            is_html = True
        if '<a' in text:
            is_html = True
        if '<span' in text:
            is_html = True

        return is_html

    # TODO: refactor to configuration
    def expand_punctuation(self, text):
        expanded_text = text
        expanded_text = expanded_text.replace('.', ' . ')
        expanded_text = expanded_text.replace('!', ' ! ')
        expanded_text = expanded_text.replace('?', ' ? ')
        expanded_text = expanded_text.replace(',', ' , ')
        expanded_text = expanded_text.replace(':', ' : ')
        expanded_text = expanded_text.replace('  ', ' ')

        return expanded_text

    def contract_punctuation(self, text):
        contracted_text = text
        contracted_text = contracted_text.replace(' . ', '. ')
        contracted_text = contracted_text.replace(' ! ', '! ')
        contracted_text = contracted_text.replace(' ? ', '? ')
        contracted_text = contracted_text.replace(' , ', ', ')
        contracted_text = contracted_text.replace(' : ', ': ')

        return contracted_text

    def replace_non_alphanumerics(self, text):
        replaced_text = text
        replaced_text = replaced_text.replace(' ', '~~1')
        replaced_text = replaced_text.replace('.', '~~2')
        replaced_text = replaced_text.replace('!', '~~3')
        replaced_text = replaced_text.replace('?', '~~4')
        replaced_text = replaced_text.replace(',', '~~5')
        replaced_text = replaced_text.replace(':', '~~6')
        replaced_text = replaced_text.replace('/', '~~7')

        return replaced_text

    def restore_non_alphanumerics(self, text):
        restored_text = text
        restored_text = restored_text.replace('~~1', ' ')
        restored_text = restored_text.replace('~~2', '.')
        restored_text = restored_text.replace('~~3', '!')
        restored_text = restored_text.replace('~~4', '?')
        restored_text = restored_text.replace('~~5', ',')
        restored_text = restored_text.replace('~~6', ':')
        restored_text = restored_text.replace('~~7', '/')

        return restored_text

    def count_number_of_tokens(self, text, model='text-davinci-003'):

        if model == 'text-davinci-003':
            return len(self.gpt_encoding.encode(text))
        else:
            return len(self.gpt_chat_encoding.encode(text))

    def truncate_text_by_number_of_tokens(self, input_text, desired_num_tokens, model='text-davinci-003'):
        """
        Using GPT2 tokenizer, this function returns a truncated text which has
        aproximatelly the desired number of tokens.
        Needed for foreign languages that have a different number of tokens per word.
        """

        # num_words = len(input_text.split())
        num_tokens = self.count_number_of_tokens(input_text)
        if num_tokens > desired_num_tokens:
            truncated_text = input_text
            for _ in range(len(input_text.split())):
                truncated_text = ' '.join(truncated_text.split()[:-1])
                num_tokens = self.count_number_of_tokens(truncated_text, model=model)
                if num_tokens <= desired_num_tokens:
                    break

        else:
            truncated_text = input_text

        return truncated_text

    def gpt3_chapter_title(self, chapter, language='English', exclude_titles=[]):
        '''
        There is a maximun of 2049 tokens (prompt + response) for Curie-001.
        So, since 1500 words is about 2000 tokens, and we are requesting 20
        tokens for the response. We will be safe submiting 1400 words.
        '''
        #chapter = ' '.join(chapter.split()[:1500])
        chapter = self.truncate_text_by_number_of_tokens(input_text=chapter, desired_num_tokens=1950)

        previous_title_rule = ''
        if len(exclude_titles) > 0:
            previous_title_rule = f"4. Create a title that is distinct from the title of these previous chapters: {', '.join(exclude_titles)}\n"

        prompt = f"Write a concise title that communicates the overall concept of the following conversation. Follow these rules: \n1. Write the title in {language}. Do not include any language that is not {language}. \n2. The title should be between 2 to 6 words long. \n3. Be sure to avoid mentioning dates.\n{previous_title_rule}[START CONVERSATION]\n '{chapter}'\n[END CONVERSATION]\nThe title of this conversation in {language} is: '"
        # print("PROMPT:")
        # print(prompt)
        response = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo')
        #print("RESPONSE:")
        #print(response)
        title_curie_0 = response
        title_curie_0 = title_curie_0.replace("\n\n", " ")
        title_curie_0 = title_curie_0.replace("\n", " ")
        title_curie_0 = title_curie_0.strip()

        if title_curie_0[-1] == "'":
            title_curie_0 = title_curie_0[:-1]
        elif title_curie_0[-1] == "'.":
            title_curie_0 = title_curie_0[:-2]
        if ":" in title_curie_0:
            title_curie_0 = title_curie_0[:title_curie_0.index(':')]
            title_curie_0 = title_curie_0

        if len(title_curie_0.split()) > 6:
            prompt = f"Simplify this chapter title into 6 words or less in {language}: 'Everything I Know About Outdoor Camping in The Woods'\nSimplified title: 'Outdoor Camping'\n\nSimplify this chapter title into 6 words or less: 'How To Make A Chocolate Cake From Scratch.'\nSimplified title: 'Make a Chocolate Cake From Scratch'\n\nSimplify this chapter title into 6 words or less: '{title_curie_0}'\nSimplified title in {language}: '"
            #print("PROMPT:")
            #print(prompt)
            response = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo')
            #print("RESPONSE:")
            #print(response)
            title_curie = response
            title_curie = title_curie.replace("\n\n", " ")
            title_curie = title_curie.replace("\n", " ")
            title_curie = title_curie.strip()

            if ":" in title_curie:
                title_curie = title_curie[:title_curie.index(':')]
                title_curie = title_curie

            return self.format_title(title_curie)
        else:
            return self.format_title(title_curie_0)

    # ----------------------------------------------------------------------------------------------------------------------------
    # Functions to parse the episode description and returns the chapters if found.
    # ----------------------------------------------------------------------------------------------------------------------------

    def cleanhtml(self, raw_html):
        cleantext = re.sub(r'<a.*?>', ' ', raw_html)                # remove anchor link but not the text
        cleantext = re.sub("</a>", ' ', cleantext)                  #
        cleantext = re.sub(r'<li.*?>', ' ', cleantext)              # it only contains format elements
        cleantext = re.sub("</em>", ' ', cleantext)                 # remove emphasis
        cleantext = re.sub("<em>", ' ', cleantext)                  #
        cleantext = re.sub("</strong>", ' ', cleantext)             # remove strong
        cleantext = re.sub("<strong>", ' ', cleantext)              #
        cleantext = re.sub(r'http\S+', ' ', cleantext)              # remove links
        cleantext = re.sub(r'https\S+', ' ', cleantext)             #
        cleantext = re.sub('@\S+', ' ', cleantext)                  # remove mentions
        cleantext = re.sub('#\S+', ' ', cleantext)                  # remove hashtags
        cleantext = re.sub("[0-9]:[0-9]/", ' ', cleantext)          # removing cases like 1:1/text

        # All types of linebreak are replaced by the unique tag " SEPSEP "
        cleantext = re.sub("<br />", ' SEPSEP ', cleantext)
        cleantext = re.sub("<br/>", ' SEPSEP ', cleantext)
        cleantext = re.sub("</li>", ' SEPSEP ', cleantext)
        cleantext = re.sub("<li>", ' SEPSEP ', cleantext)
        cleantext = re.sub("</ul>", ' SEPSEP ', cleantext)                 # remove unordered list elemens
        cleantext = re.sub("<ul>", ' SEPSEP ', cleantext)                  #
        cleantext = re.sub("</p>", ' SEPSEP ', cleantext)
        cleantext = re.sub("<p>", ' SEPSEP ', cleantext)
        cleantext = re.sub("/>", ' SEPSEP ', cleantext)
        cleantext = re.sub("<p.*?>", ' SEPSEP ', cleantext)
        cleantext = re.sub(r'/(\r\n)+|\r+|\n+|\t+/', ' SEPSEP ', cleantext)
        # This most be at the end:
        cleantext = re.sub('<.*?>', '', cleantext)

        return cleantext

    def format_title(self, string):
        '''
        Formats an input string as a article title.
        '''

        string = string.strip()
        string = string.replace("\n", " ")
        string = string.replace("\t", " ")
        string = string.replace("\r", " ")
        string = string.replace("  ", " ")

        # Capitalize the first letter of each word in accorance with the titlecase module
        string = titlecase(string)

        # Continually remove [".", "!", "'"] from the end of the string until it is not present
        while string[-1] in [".", "!", "'"]:
            string = string[:-1]

        return string

    def remove_emojis(self, text):
        emoj = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002500-\U00002BEF"  # chinese char
            u"\U00002702-\U000027B0"
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            u"\U0001f926-\U0001f937"
            u"\U00010000-\U0010ffff"
            u"\u2640-\u2642"
            u"\u2600-\u2B55"
            u"\u200d"
            u"\u23cf"
            u"\u23e9"
            u"\u231a"
            u"\ufe0f"  # dingbats
            u"\u3030"
                        "]+", re.UNICODE)
        return re.sub(emoj, '', text)

    def extra_cleaning(self, splitted_text):
        '''
        Formating the timestamps and converting this formats: 00:00:00 to 02:00:00
        or 00:00:00.000 - 02:00:00 into just: 00:00:00.
        The end of the timestamp is the start of the next one - 1.
        '''
        new_splitted_text = []
        for word in splitted_text:
            if 'TIMETIME—TIMETIME' in word:
                new_word = word.split('—')
                new_splitted_text.extend(new_word)
            elif 'TIMETIME-TIMETIME' in word:
                new_word = word.split('-')
                new_splitted_text.extend(new_word)
            elif 'TIMETIME–TIMETIME' in word:
                new_word = word.split('–')
                new_splitted_text.extend(new_word)
            else:
                new_splitted_text.append(word)

        splitted_text = new_splitted_text
        while '—' in splitted_text: splitted_text.remove('—')
        while '-' in splitted_text: splitted_text.remove('-')
        while '–' in splitted_text: splitted_text.remove('–')
        while '|' in splitted_text: splitted_text.remove('|')

        return splitted_text

    def filtering_timestamps(self, splitted_text, timestamps):
        '''
        Filtering the timestamps that are not really timestamps, like
        daily hours.
        '''
        splitted_text_delete_indices = []
        timestamps_delete_indices = []
        counter = 0
        for i in range(len(splitted_text)):
            if 'TIMETIME' in splitted_text[i]:
                if 'TIMETIME' in splitted_text[i-1]:
                    splitted_text_delete_indices.append(i)
                    timestamps_delete_indices.append(counter)
                elif i - 2 >= 0 and (splitted_text[i - 1] == 'to' and 'TIMETIME' in splitted_text[i-2]):
                    splitted_text_delete_indices.append(i)
                    splitted_text_delete_indices.append(i - 1)
                    timestamps_delete_indices.append(counter)

                elif splitted_text[i][-2:].lower() == 'AM'.lower() or \
                     splitted_text[i][-2:].lower() == 'PM'.lower() or \
                     splitted_text[i][-3:].lower() == 'AM—'.lower() or \
                     splitted_text[i][-3:].lower() == 'PM—'.lower() or \
                     splitted_text[i][-3:].lower() == 'AM-'.lower() or \
                     splitted_text[i][-3:].lower() == 'PM-'.lower() or \
                     splitted_text[i][-3:].lower() == 'AM–'.lower() or \
                     splitted_text[i][-3:].lower() == 'PM–'.lower():
                    splitted_text_delete_indices.append(i)
                    timestamps_delete_indices.append(counter)

                elif i + 1 <= len(splitted_text) -1 and (
                    splitted_text[i + 1].lower() == 'AM'.lower() or \
                    splitted_text[i + 1].lower() == 'PM'.lower() or \
                    splitted_text[i + 1].lower() == 'AM—'.lower() or \
                    splitted_text[i + 1].lower() == 'PM—'.lower() or \
                    splitted_text[i + 1].lower() == 'AM-'.lower() or \
                    splitted_text[i + 1].lower() == 'PM-'.lower() or \
                    splitted_text[i + 1].lower() == 'AM–'.lower() or \
                    splitted_text[i + 1].lower() == 'PM–'.lower()
                    ):
                    splitted_text_delete_indices.append(i)
                    timestamps_delete_indices.append(counter)
                counter += 1

        if len(splitted_text_delete_indices) > 0:
            for index in sorted(splitted_text_delete_indices, reverse=True):
                del splitted_text[index]
            for index in sorted(timestamps_delete_indices, reverse=True):
                del timestamps[index]

        return splitted_text, timestamps

    def format_timestamps(self, mixed_timestamps):
        '''
        This function transforms any timetamp format found into [hours, minutes, seconds].
        Output: [['0', '4', '23'], ['0', '5', '12'], ...]
        '''
        timestamps = []
        for timestamp in mixed_timestamps:
            if timestamp[0] != '':
                timestamps.append(timestamp[0].split(':'))
            elif timestamp[1] != '':
                timestamps.append(['0'] + timestamp[1].split(':'))

        # Replacing '' by '0' in the timestamps.
        new_timestamps = []
        for i in range(len(timestamps)):
            temp = []
            for j in range(len(timestamps[0])):
                if timestamps[i][j] != '':
                    temp.append(timestamps[i][j])
                else:
                    temp.append('0')
            new_timestamps.append(temp)

        return new_timestamps

    def convert_timestamps_to_seconds(self, timestamps):
        timestamps_in_seconds = []
        for timestamp in timestamps:
            timestamps_in_seconds.append(
                int(timestamp[0])*3600 + int(timestamp[1])*60 + int(timestamp[2])
                )
        return timestamps_in_seconds

    def get_timestamp_indices(self, clean_text, timestamps):
        '''
        All timestamps (in any format) are replaced by the unique tag "TIMETIME"
        to find their indices in the splitted_text.
        '''
        for i in range(len(timestamps)):
            clean_text = re.sub("([0-9]?[0-9]:[0-5]?[0-9]:[0-5]?[0-9])|([0-5]?[0-9]:[0-5]?[0-9])", 'TIMETIME', clean_text, count=1)

        splitted_text = clean_text.split()
        splitted_text = self.extra_cleaning(splitted_text)
        new_splitted_text, new_timestamps = self.filtering_timestamps(splitted_text, timestamps)
        new_timestamp_indices = [i for i, x in enumerate(new_splitted_text) if "TIMETIME" in x]

        return new_splitted_text, new_timestamp_indices, new_timestamps

    def move_forward(self, timestamp_indice, splitted_text):
        sameline = True
        title = []
        j = 1
        while sameline:
            if "SEPSEP" not in splitted_text[timestamp_indice + j] and "TIMETIME" not in splitted_text[timestamp_indice + j]:
                title.append(splitted_text[timestamp_indice + j])
                if timestamp_indice + j == len(splitted_text) - 1:
                    sameline = False
                j += 1
            else:
                sameline = False

        text = ' '.join(title[:])
        return text

    def move_backward(self, timestamp_indice, splitted_text):
        sameline = True
        title = []
        j = 1
        while sameline:
            if "SEPSEP" not in splitted_text[timestamp_indice - j] and "TIMETIME" not in splitted_text[timestamp_indice - j]:
                title.append(splitted_text[timestamp_indice - j])
                if timestamp_indice - j == 0:
                    title.reverse()
                    sameline = False
                j += 1
            else:
                title.reverse()
                sameline = False

        text = ' '.join(title[:])
        return text

    def get_titles_by_rules(self, timestamp_indices, splitted_text):

        titles = []
        for timestamp_indice in timestamp_indices:
            if timestamp_indice == 0:
                # Rule 1: If the episode description starts with a timestamp,
                # the timestamp is followed by the chapter title.
                title = self.move_forward(timestamp_indice, splitted_text)
                titles.append(title)

            elif timestamp_indice == len(splitted_text) - 1:
                # Rule 2: If the episode description ends with a timestamp,
                # the timestamp is preceded by the chapter title.
                title = self.move_backward(timestamp_indice, splitted_text)
                titles.append(title)

            elif "SEPSEP" in splitted_text[timestamp_indice-1]:
                # Rule 3: If the timestamp is preceded by a line break (SEPSEP),
                # it is followed by the chapter title.
                title = self.move_forward(timestamp_indice, splitted_text)
                titles.append(title)

            elif "SEPSEP" in splitted_text[timestamp_indice+1]:
                # Rule 4: If the timestamp is followed by a line break (SEPSEP),
                # it is preceded by the chapter title.
                title = self.move_backward(timestamp_indice, splitted_text)
                titles.append(title)

            elif '.' in splitted_text[timestamp_indice][-1] or ',' in splitted_text[timestamp_indice][-1] or '(' in splitted_text[timestamp_indice]:
                # Rule 5: If the timestamp is followed by a period '.', comma ',',
                # or conteins a '(', it will be preceded by the chapter title.
                title = self.move_backward(timestamp_indice, splitted_text)
                titles.append(title)

            else:
                # Rule 6: If the timestamp does not ovey any of the previous rules.
                # We will consider the timestamp will be followed by the chapter title.
                # Like in many cases like this one: ...the way you're today. [4:40] The real reason ...
                title = self.move_forward(timestamp_indice, splitted_text)
                titles.append(title)
        return titles

    def get_times_and_titles(self, timestamps_in_seconds, titles):
        '''
        Final alignment of timestamps and titles.
        '''
        times_and_titles = {}
        for i in range(len(timestamps_in_seconds)):
            # Joining the text back.
            text = titles[i]
            # final touches
            text = text.replace(" ,",",")
            text = text.replace(" .",".")
            if len(text) > 0:
                if text[0] == "'" and text[-1] == "'":
                    text = text[1:-1]
                if text[0] == '"' and text[-1] == '"':
                    text = text[1:-1]
                if text[-1] in ['.', ',', ':', ';']:
                    if text[-3:] != '...':
                        text = text[:-1]
            text = re.sub('^& ?', '', text)
            times_and_titles[timestamps_in_seconds[i]] = text

        return times_and_titles

    def sort_chapters(self, time_and_title):
        '''
        Sort the chapters by timestamp.
        Sometimes there are timestamps added out of sequence. This is why we will order
        the start time and then define the end time.
        '''
        starts=list(time_and_title.keys())
        starts.sort()
        ends = []
        chapters = []
        for i in range(len(starts)):
            if i < len(starts) - 1:
                ends.append(starts[i+1] -1)
            else:
                ends.append(None)
            chapters.append({'start': starts[i], 'end': ends[i], 'title': time_and_title[starts[i]]})
            # #print('%s %s: %s' %(starts[i], ends[i], time_and_title[starts[i]]))

        return chapters

    def cleanse_chapters(self, chapters):
        '''
        Replace html entities with their unicode equivalent.
        '''
        htmlEntities = {
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&lt;': '<',
            '&gt;': '>'
        }

        for i in range(len(chapters)):
            for entity in htmlEntities:
                chapters[i]['title'] = chapters[i]['title'].replace(entity, htmlEntities[entity])
        return chapters

    def get_chapters(self, description_text):

        clean_text = self.cleanhtml(description_text)
        clean_text = self.remove_emojis(clean_text)

        # Looking for diferent types of timestamps on episodes.
        mixed_timestamps = re.findall("([0-9]?[0-9]:[0-5]?[0-9]:[0-5]?[0-9])|([0-5]?[0-9]:[0-5]?[0-9])", clean_text)

        if len(mixed_timestamps) > 0:
            timestamps = self.format_timestamps(mixed_timestamps)
            splitted_text, timestamp_indices, timestamps = self.get_timestamp_indices(clean_text, timestamps)
            timestamps_in_seconds = self.convert_timestamps_to_seconds(timestamps)
            titles = self.get_titles_by_rules(timestamp_indices, splitted_text)
            if titles is not None and len(titles) >= 2:
                time_and_title = self.get_times_and_titles(timestamps_in_seconds, titles)
                chapters = self.sort_chapters(time_and_title)
                chapters = self.cleanse_chapters(chapters)
                return chapters
            else:
                return None

    # ----------------------------------------------------------------------------------------------------------------------------
    # Functions used by AI Chapters Generation (Need to be refactored)
    # ----------------------------------------------------------------------------------------------------------------------------

    async def get_paragraphs(self, sentences_object):
        '''
        This function generates a set of paragraphs out of a list of sentences
        using our "AI previews" model.
        '''
        sentences = [item['content'] for item in sentences_object]
        starts = [item['start'] for item in sentences_object]
        ends = [item['end'] for item in sentences_object]

        paragraphs = []
        i = 0
        end = False
        safety_counter = 0
        while not end:
            '''
            To generate a paragraph, we need a "query", a "context" and the "AI previews model".
            - query:   The first three sentences.
            - context: Up to 1500 words around the query. (1500 is around the average numbers
              of words used to train the AI previews model)
            '''

            safety_counter += 1
            if safety_counter > 30000:
                break

            query = ' '.join(sentences[i:i+3])
            # DEBUG: print("Query: ", query)
            context_previous = []
            context_next = []

            continuee = True
            counter = 1
            num_words = 0
            # Context before the query.
            while continuee:
                num_words += len(sentences[i-counter].split())
                if i - counter >= 0 and num_words < 750:
                    context_previous.append(sentences[i-counter])
                    counter += 1
                else:
                    continuee = False
            context_previous.reverse()
            # DEBUG: print("Context previous: ", context_previous)

            # Context after the query.
            continuee = True
            counter = 0
            num_words = 0
            while continuee:
                if i + counter < len(sentences) - 1:
                    num_words += len(sentences[i+counter].split())
                    if num_words < 750:
                        context_next.append(sentences[i+counter])
                        counter += 1
                    else:
                        continuee = False
                elif i + counter == len(sentences) - 1:
                    context_next.append(sentences[i+counter])
                    continuee = False
                else:
                    continuee = False

            # DEBUG: print("Context next: ", context_next)

            # At least 200 words after the query are needed.
            if len(' '.join(context_next).split()) >= 200:
                context = ' '.join(context_previous + context_next)

                chunk = await core.inference.previews([{'query': query, 'context': context}])
                chunk = chunk['previews'][0]
                chunk = chunk.replace(" ,", ",")
                chunk = chunk.replace(" .", ".")
                chunk = chunk.replace(" ?", "?")
                chunk = chunk.replace(" '", "'")

                full_chunk = ''
                for j in range(i,len(sentences)):
                    full_chunk = full_chunk + ' ' + sentences[j]
                    full_chunk = full_chunk.replace(" ,", ",")
                    full_chunk = full_chunk.replace(" .", ".")
                    full_chunk = full_chunk.replace(" ?", "?")
                    full_chunk = full_chunk.replace(" '", "'")

                    # DEBUG: print("Chunk: ", chunk)
                    # DEBUG: print("Full chunk: ", full_chunk)
                    # DEBUG: print('-----------------')
                    if chunk in full_chunk:
                        paragraphs.append({'content': full_chunk[1:], 'start': starts[i], 'end': ends[j]})
                        break
                i = j + 1
            elif len(context_next) > 0:
                paragraphs.append({'content': ' '.join(context_next), 'start': starts[i], 'end': ends[-1]})
                end = True
            else:
                end = True

        return paragraphs

    def get_samples_to_score_for_topical_breaks(self, paragraphs):
        '''
        This function generates a set of samples to score for the topic breaks.
        '''

        min_number_of_word_per_side = 850

        samples_to_score = []
        for index in range(len(paragraphs)):
            sample = {
                'topic_1': "",
                'topic_2': ""
            }

            # get all words from the left side of the paragraph up to min_number_of_word_per_side
            left_side = []
            for i in range(index, -1, -1):
                count_current_left_side_words = 0
                for paragraph in left_side:
                    count_current_left_side_words += len(paragraph.split())

                if count_current_left_side_words >= min_number_of_word_per_side:
                    break

                left_side.append(paragraphs[i])

            left_side.reverse()
            sample['topic_1'] = ' '.join(left_side)

            # get all words from the right side of the paragraph up to min_number_of_word_per_side
            right_side = []
            for i in range(index, len(paragraphs)):
                count_current_right_side_words = 0
                for paragraph in right_side:
                    count_current_right_side_words += len(paragraph.split())

                if count_current_right_side_words >= min_number_of_word_per_side:
                    break

                right_side.append(paragraphs[i])

            sample['topic_2'] = ' '.join(right_side)

            samples_to_score.append(sample)

        #for sample in samples_to_score:
            #print(sample)
            #print('-----------------')

        return samples_to_score

    async def get_topical_break_scores(self, samples_to_score_for_topic_breaks):
        '''
        This function generates a set of scores for the topic breaks.
        '''

        # bucket sample into groups of 3
        samples_grouped = []
        for i in range(0, len(samples_to_score_for_topic_breaks), 3):
            samples_grouped.append(samples_to_score_for_topic_breaks[i:i+3])

        score_groups = []
        for group in samples_grouped:
            #print(group)
            scores = await core.inference.topical_break_scores(group)
            #print(scores)
            #print('-----------------')
            #print('-----------------')
            #print('-----------------')
            score_groups.append(scores['scores'])

        # flatten score groups
        topical_break_scores = []
        for group in score_groups:
            for score in group:
                topical_break_scores.append(score)

        return topical_break_scores

    async def get_ai_chapters(self, paragraphs_object, topical_break_scores, language = 'English'):

        paragraphs = [item['content'] for item in paragraphs_object]
        starts = [item['start'] for item in paragraphs_object]
        ends = [item['end'] for item in paragraphs_object]

        chapters = []
        chapter = []
        i = 0
        sub_breaks = []
        sub_chapters = {}
        chapter_start = starts[0]

        safety_counter = 0
        while True:
            safety_counter += 1
            if safety_counter > 30000:
                break

            chapter.append(paragraphs[i])
            temp = chapter.copy()
            sub_chapters[i] = {'content': ' '.join(temp), 'start': chapter_start, 'end': ends[i]}

            previously_used_titles = [item['title'] for item in chapters]

            # handle last chapter
            if i == len(topical_break_scores)-1:
                chapter_text = sub_chapters[i]['content']
                discovered_chapter = {
                    'title': self.gpt3_chapter_title(chapter_text, language, previously_used_titles),
                    # 'title': await self.bloom_chapter_title(chapter_text),
                    'content': chapter_text,
                    'start': sub_chapters[i]['start'],
                    'end': sub_chapters[i]['end']}
                chapters.append(discovered_chapter)
                break

            num_words = len(' '.join(chapter).split())
            #print(f"num_words: {num_words}")
            sub_breaks.append(i)

            if topical_break_scores[i] >= 0.90 and num_words >= 600:
                # just right
                #print("just right")
                if len(sub_breaks) > 1:
                    higher_sub_break = -1
                    for index, sub_break in enumerate(sub_breaks):
                        if topical_break_scores[sub_break] > higher_sub_break and index > len(sub_breaks) / 2:
                            higher_sub_break = topical_break_scores[sub_break]
                            higher_sub_break_index = sub_break

                    if higher_sub_break >= 0.999 and higher_sub_break_index < i:
                        chapter_text = sub_chapters[higher_sub_break_index]['content']

                        discovered_chapter = {
                            'title': self.gpt3_chapter_title(chapter_text, language, previously_used_titles),
                            # 'title': await self.bloom_chapter_title(chapter_text),
                            'content': chapter_text,
                            'start': sub_chapters[higher_sub_break_index]['start'],
                            'end': sub_chapters[higher_sub_break_index]['end']}

                        chapters.append(discovered_chapter)

                        i = higher_sub_break_index + 1
                        chapter = []
                        sub_breaks = []
                        sub_chapters = {}
                        chapter_start = starts[i]
                    else:
                        chapter_text = sub_chapters[i]['content']

                        discovered_chapter = {
                            'title': self.gpt3_chapter_title(chapter_text, language, previously_used_titles),
                            # 'title': await self.bloom_chapter_title(chapter_text),
                            'content': chapter_text,
                            'start': sub_chapters[i]['start'],
                            'end': sub_chapters[i]['end']}

                        chapters.append(discovered_chapter)

                        i += 1
                        chapter = []
                        sub_breaks = []
                        sub_chapters = {}
                        chapter_start = starts[i]

                else:
                    chapter_text = sub_chapters[i]['content']

                    discovered_chapter = {
                        'title': self.gpt3_chapter_title(chapter_text, language, previously_used_titles),
                        # 'title': await self.bloom_chapter_title(chapter_text),
                        'content': chapter_text,
                        'start': sub_chapters[i]['start'],
                        'end': sub_chapters[i]['end']}

                    chapters.append(discovered_chapter)

                    i += 1
                    chapter = []
                    sub_breaks = []
                    sub_chapters = {}
                    chapter_start = starts[i]

            elif num_words > 2500:
                # too long
                #print("too long")

                if len(sub_breaks) > 1:
                    #print("determining highest sub break")
                    highest_sub_break = -1

                    for index, sub_break in enumerate(sub_breaks):
                        #print(f"sub_break: {sub_break} - {topical_break_scores[sub_break]}")
                        if topical_break_scores[sub_break] > highest_sub_break and index > len(sub_breaks) / 5:
                            highest_sub_break = topical_break_scores[sub_break]
                            highest_sub_break_index = sub_break
                    #print(highest_sub_break_index)
                    #print(sub_chapters)

                    chapter_text = sub_chapters[highest_sub_break_index]['content']

                    discovered_chapter = {
                        'title': self.gpt3_chapter_title(chapter_text, language, previously_used_titles),
                        # 'title': await self.bloom_chapter_title(chapter_text),
                        'content': chapter_text,
                        'start': sub_chapters[highest_sub_break_index]['start'],
                        'end': sub_chapters[highest_sub_break_index]['end']}
                    #print(discovered_chapter)
                    chapters.append(discovered_chapter)

                    i = highest_sub_break_index + 1
                    chapter = []
                    sub_breaks = []
                    sub_chapters = {}
                    chapter_start = starts[i]
            else:
                i += 1

        return chapters

    # ----------------------------------------------------------------------------------------------------------------------------
    # Functions used by Episode Summary
    # ----------------------------------------------------------------------------------------------------------------------------

    def get_content_per_chapter(self, chapters, sentences_object):
        chapter_intervals = [{'start': chapter.start, 'end': chapter.end} for chapter in chapters]
        chapters_content = []
        for interval in chapter_intervals:
            chapter_content = []
            for sentence in sentences_object:
                # Only considering the end of the sentence to be inside the chapter:
                if sentence['end'] >= interval['start'] and sentence['end'] <= interval['end']:
                    chapter_content.append(sentence['content'])

            chapters_content.append(' '.join(chapter_content))

        return chapters_content

    def segment_splitter(self, text):
        '''
        This function splits an arbitrary large text into sentences,
        by doing some corrections to the spacy output.
        '''
        sentences = self.nlp(text).sents
        # sentences_list = [str(i).strip() for i in sentences if str(i).strip() != '']

        sentences_list = []
        for index, sentence in enumerate(sentences):
            clean_sentence = str(sentence).strip()
            if clean_sentence != '':
                # To fix cases like: ['of 7.2 gigawatts', '.']
                if clean_sentence != '.' and clean_sentence != '?' and clean_sentence != ',':
                    sentences_list.append(clean_sentence)
                else:
                    if index > 0:
                        sentences_list[index - 1] = sentences_list[index - 1] + clean_sentence

        return sentences_list

    def dots_parsing(self, segment):
        '''
        This function is extensively used by whisper.
        In order to facilitate future applications that rely on sentences or paragraphs segmentations,
        the dots and question marks will always indicate End Of Sentence, except when found in the
        allowed_in_sentence_dots listed above, in float numbers and in links ending in .com.
        Dr. -> Dr.
        Mr. -> Mr.
        Jr. -> Jr.
        ...
        i.e. -> ie
        p.m. -> pm
        a.m. -> am
        N.Y. -> NY
        N.A.S.A. -> NASA
        1.75 pounds -> 1.75 pounds
        livmomentous.com -> livmomentous.com

        These allowed_in_sentence_dots must be considered in the "transcript_files/get_sentences"
        function, because it uses dots and ? to split texts.
        '''
        # if dot found in string:
        if '.' in segment[:-1]:
            sentences = self.segment_splitter(segment)
            new_segment = []
            for sentence in sentences:
                if '.' in sentence[:-1]:
                    new_sentence = []
                    words = sentence[:-1].split()
                    for word in words:
                        if '.' in word and not any(char.isdigit() for char in word):
                            # remove comma from word just for analysis:
                            word_without_comma = word.replace(',', '')
                            # Most of the time .com is at the end of the sentence.
                            if word_without_comma not in self.allowed_in_sentence_dots and '.co' not in word_without_comma:
                                word = word.replace('.', '')
                                new_sentence.append(word)
                            else:
                                new_sentence.append(word)
                        else:
                            new_sentence.append(word)

                    new_sentence = ' '.join(new_sentence) + sentence[-1]
                    new_segment.append(new_sentence)
                else:
                    new_segment.append(sentence)

            new_segment = ' '.join(new_segment)

        else:
            new_segment = segment

        return new_segment

    def remove_incomplete_sentence(self, text_with_parsed_dots):
        '''
        Many times the Davinci output cuts the last sentence. If that happens,
        the last incompleted sentence is removed from the summary:
        '''
        summary_words = text_with_parsed_dots.split()
        end_of_summary_index = 0
        for index, word in enumerate(summary_words):
            if (word[-1] == '.' or word[-1] == '?' or word[-1] == '!' or word[-1] == "'") and word not in self.allowed_in_sentence_dots:
                end_of_summary_index = index
        whole_sentences = ' '.join(summary_words[:end_of_summary_index+1])

        return whole_sentences

    def fix_last_punctuation(self, text):
        '''
        This function fixes the last punctuation of the summary.
        '''
        if text[-1] == "'":
            text = text[:-1]

        if text[-1] == '.' or text[-1] == '?' or text[-1] == '!':
            return text
        else:
            return text + '.'

    def get_episode_summary(self, transcript, chapters, language = 'English'):
        '''
        There is a maximun of 4097 tokens (prompt + response) for davinci-003.
        So, since 2000 words is about 3125 tokens, and we are requesting 100 and 200
        tokens for the response. We will be safe submiting 2500 words.
        '''
        episode_summary = {
            'summary': '',
            'chapter_summaries': []
        }

        sentences_object = transcript.get_sentences()
        chapters_content = self.get_content_per_chapter(chapters, sentences_object)

        for index, chapter in enumerate(chapters_content):
            # chapter = ' '.join(chapter.split()[:1000])
            chapter = self.truncate_text_by_number_of_tokens(input_text=chapter, desired_num_tokens=1300)

            prompt = "\n[START CONVERSATION]\n"
            prompt += chapter
            prompt += "\n[END CONVERSATION]\n\n"
            prompt += f"""
Write a short summary for the following podcast episode conversation above as if you were the host/hosts of the podcast.
Write the summary in the style of a chapter overview.

Follow these rules:
1. Write the summary in {language}. Do not include any language that is not {language}.
2. The summary should be written as an overview of topics discussed in the conversation.
3. Begin the summary with "This chapter..." written in {language}.
4. Begin the summary by speaking directly to the topics within the conversation.
5. Avoid language like 'the speaker', 'the participants', 'the conversation', 'in this discussion', 'in this podcast episode', or 'in this conversation'.
6. Avoid language like, '...this podcast chapter explores how...' or '...this podcast chapter discusses how...'. Instead use language like, '...we explore how...' or '...I discuss how...' as appropriate.
7. If first person voice is used in the transcript as an episode introduction, the summary should be written in first person voice.
8. Do not summarize individual advertisments or sponsorships.
9. Remember this is a summary of the chapter, not the entire podcast episode.
10. Write a one-paragraph summary.
11. You must not use these words: "delve", "dive", "deep dive", "delves", "dives", "deep dive", "we delve", "we dive"

A one-paragraph summary of this podcast episode conversation in {language}:
"""
            #print('********************************************************************')
            #print('********************************************************************')
            #print('********************************************************************')
            #print(prompt)

            #summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=256)
            #summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=256)
            #summary = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=256)
            summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=512, temperature=1.2, top_p=0.8)
            summary = summary.strip()
            summary = self.strip_opening_quotes(summary)
            #print('--------------------------------------------------------------------')
            #print(summary)
            #print('********************************************************************')
            #print('********************************************************************')
            #print('********************************************************************')

#            prompt = f"""
#[START PODCAST CHAPTER SUMMARY]
#{summary}
#[END PODCAST CHAPTER SUMMARY]
#\n\n
#"""
#            prompt += f"""
#Edit the podcast chapter summary above following the rules below:
#
#1. Remove all 'In this...', 'dive', 'dives', and 'delve', 'delves' and similar language usage.
#2. Write from the perspective of a podcast host whose creating chapter summaries for their podcast.
#3. Avoid starting the summary with "In this podcast episode..." or "In this conversation..." or "In this chapter...".
#4. Avoid starting the summary with 'the speaker', 'the participants', 'the conversation', 'in this discussion', 'in this podcast episode', or 'in this conversation'.
#5. Avoid language like, '...this podcast chapter explores how...' or '...this podcast chapter discusses how...'. Instead use language like, '...we explore how...' or '...I discuss how...' as appropriate. Avoid saying, "As a host,..."
#6. Do not change the meaning of the summary or add any new information not already present.
#7. Begin the summary with "This chapter..." written in {language}
#8. The summary should be written in the style of a chapter summary, not an episode summary. So, don't use language like, "Today's episode.." - instead, simple jump right in and say, for example, "We discuss..."
#9. The summary should be one paragraph.
#10. Do not include any delimiters like [START PODCAST CHAPTER SUMMARY] - just write the new summary.
#
#Edited podcast chapter summary in {language}:
#"""
#
#            #print(prompt)
#            summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=256, temperature=0.0)
#            #summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=256, temperature=0.2)
#            #summary = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=256, temperature=0.2)
#            summary = summary.strip()
#            summary = self.strip_opening_quotes(summary)
            #print('--------------------------------------------------------------------')
            #print(summary)

            #print(prompt)
            #print(summary)
            #print('----------------------------------------------------')


            chapter_summary = {
                'description': chapters[index].description,
                'start': chapters[index].start,
                'end': chapters[index].end,
                'summary': summary,
            }

            episode_summary['chapter_summaries'].append(chapter_summary)


        max_summary_prompt_length = 3000
        summaries = ""
        for chapter_summary in episode_summary['chapter_summaries']:
            summaries += "Podcast Episode Chapter Title: " + chapter_summary['description'] + "\n"
            summaries += "Podcast Episode Chapter Summary: " + chapter_summary['summary'] + "\n\n"

        summaries = summaries.replace('\n', '{{{newline}}}')
        # summaries = summaries.split()[:3500]
        # summaries = ' '.join(summaries)
        summaries = self.truncate_text_by_number_of_tokens(input_text=summaries, desired_num_tokens=4550)
        summaries = summaries.replace('{{{newline}}}', '\n')

        episode_summary['chapters_overview'] = summaries

        prompt_transcript = ""
        sentences = transcript.get_sentences()
        max_transcript_word_length = 750
        max_transcript_token_length = 1000
        if max_transcript_token_length > 0:
            prompt_transcript = f"\nTranscript (first {max_transcript_word_length} words):\n"
            for sentence in sentences:
                # if len(prompt_transcript.split()) + len(sentence['content'].split()) < max_transcript_word_length:
                new_sentence = prompt_transcript + ' ' + sentence['content']
                num_tokens = self.count_number_of_tokens(new_sentence)
                if num_tokens < max_transcript_token_length:
                    prompt_transcript += sentence['content'] + '\n'
                else:
                    break

        overview = summaries + prompt_transcript

        if len(episode_summary['chapters_overview']) == 0:
            episode_summary['chapters_overview'] = prompt_transcript

        episode_summary['num_paragraphs'] = "two"
        if len(chapters) > 3:
            episode_summary['num_paragraphs'] = "three"

        prompt = f"[START IN-DEPTH OVERVIEW]{overview}[END IN-DEPTH OVERVIEW]\n\n"
        prompt += f"""
Your task is to write a {episode_summary['num_paragraphs']}-paragraph long show notes summary for the above in-depth podcast episode overview as if you were the host/hosts of the episode.
Follow these instructions:
1. Write the summary in {language}. Do not include any language that is not {language}.
2. The summary should be written in the first person voice or the host/hosts, with consideration of the episode's guest if there was one.
3. The summary should be in a format suited for a podcast episode show notes summary, with compelling language that entices a potential podcast listener.
4. Provide a broad overview of the content of the podcast episode given all of the chapters, and do not summarize anything related to advertisments or sponsorships:
5. The show notes should be written in the form of {episode_summary['num_paragraphs']} paragraphs.
6. Restructure references to the podcast, the episode, the discussion, the conversation. For example: 'In this conversation...' might become 'Listen in as...'
7. You must avoid using the word "In [blank] episode"
8. You must not use these words: "delve", "dive", "deep dive", "delves", "dives", "deep dive", "we delve", "we dive"
9. Be sure to mention the guest/guests if there are any.
"""

        #print(prompt)
        summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=512, temperature=1.2, top_p=0.8)

        summary = summary.strip()
        summary = self.strip_opening_quotes(summary)

        # EXPERIMENTAL
        # polished_summary = self.polish_show_notes_summary(summary)
        # print("POLISHED SUMMARY")
        # print(polished_summary)
        # print("----------------------------------------------------")

        opening_techniques = self.generate_opening_techniques_for_show_notes(summary, language)
        episode_summary['opening_techniques'] = opening_techniques
        episode_summary['basic_summary'] = summary

        return episode_summary

    def generate_advanced_summary(self, original_show_notes, episode_overview, opening_techniques, num_paragraphs, language = 'English'):
        '''
        This function returns the advanced summary for the episode.
        '''

        opening_techniques_prompt = '\n'.join(opening_techniques)

        prompt = f"[START IN-DEPTH OVERVIEW]\nBasic Overview:\n{original_show_notes}\n\nChapters/Transcript Overview:\n{episode_overview}[END IN-DEPTH OVERVIEW]\n\n"

        prompt += f"""
Your task is to write a {num_paragraphs} paragraph long show notes summary for the above in-depth podcast episode overview as if you were the host/hosts of the episode.

Utilize one or more of the following techniques for the first two sentences of the show notes - use techniques that are most suited to the tone of the episode:

{opening_techniques_prompt}

Note that the technique does not start with "In this...episode" which is considered very bad form.

"""
        prompt += f"""
Follow these rules:
1. Write the summary in {language}. Do not include any language that is not {language}.
2. The summary should be written in the first person voice or the host/hosts, with consideration of the episode's guest if there was one.
3. The summary should be in a format suited for a podcast episode show notes summary, with compelling language that entices a potential podcast listener.
4. Provide a broad overview of the content of the podcast episode given all of the chapters, and do not summarize anything related to advertisements or sponsorships:
5. The show notes should be written in the form of {num_paragraphs} paragraphs.
6. Don't be cliche. Word's like "delve", "delving", "dive" and "diving" are considered cliche.
7. Don't be typical. Phrases like "In this episode" are considered typical. Even worse is "In this episode we delve.". Don't write like that.
8. Be sure to mention the guest/guests if there are any.
9. Make your summary substantially different in tone and style than the basic summary above. Use the episode chapters as reference. Don't repeat things verbatim.
10. Use a tone that is appropriate for the content. Is the content serious? Use a serious tone. Is the content sales-y? Use a sales-y tone. Is the content funny? Use a funny tone.
11. Don't ask "Are you..."

Show notes that avoid the phrase "In this..." AND are substantially different in tone and style than the basic summary:
"""
        #print(prompt)
        summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', temperature=0.8, max_tokens=512, allow_fallback=True)
        summary = summary.strip()
        summary = self.strip_opening_quotes(summary)
        summary = summary.replace('*', '')

        return summary

    def generate_keywords_for_shownotes(self, shownotes, language = 'English'):
        '''
        This function returns the keywords for the shownotes.
        '''
        prompt = f"""
Based on the following podcast episode show notes, generate a comma-seperated list of up to 20 highly relevant, on-topic keywords for the episode. Only use keywords in {language} language. Do not include any language that is not {language}. The keywords can be one or two words in length. The keywords should communicate overall meaning of the episode. Provide specific SEO-optimized keywords, and avoid any keywords that are too general, potentially confusing, or not related to the central meaning of the episode.
Follow the example below.

[START EXAMPLE]

Example show notes:
In this episode, I explored the timelessness of game design, the latest games, and navigating the gaming world. We discussed the release of the Nintendo video game, Metroid Prime and its remastered version. We compared it to other popular titles such as Zelda, Fire Emblem, and King Cured Pancake. We also talked about topics like the game's design, shooting mechanics, exploration of the world, and the idea of modernizing an old-fashioned game design. We then discussed several games and their releases, graphics, level design, and gameplay. We discussed the concept of microlocations and their importance, as well as the impact of level design on the game. Lastly, we discussed the trend of playing video games instead of eating, and the prices of palettes in Russia.

Example highly-relevant keywords based on the show notes above: Video Games, Game Design, Gameplay, Level Design, Nintendo, Metroid Prime, Shooting Mechanics, Gaming Trends, Modernizing Old Games, Microlocations

Example off-topic keywords to avoid based on the show notes above: Discussed, Navigating, Game, Level, Trend, Exploration, Modernizing, Concept, Impact, Eating
[END EXAMPLE]

[START ACTUAL SHOW NOTES]
        """

        # take the first 3000 words of shownotes while maintaining formatting
        shownotes = shownotes.replace('\n', '{{{newline}}}')
        # shownotes = shownotes.split()[:3000]
        # shownotes = ' '.join(shownotes)
        shownotes = self.truncate_text_by_number_of_tokens(input_text=shownotes, desired_num_tokens=3000) # 3800 + 25(next lines) + 256(max gpt3 output) = 4081 < 4097
        shownotes = shownotes.replace('{{{newline}}}', '\n')

        prompt += "\n" + shownotes

        prompt += f"""
[END ACTUAL SHOW NOTES]

Do not include any of the keywords in the example unless they perfectly match the content of the actual show notes above.

Highly-relevant Keywords for the actual show notes above in {language}:
        """

        prompt = prompt.strip()

        #keywords = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=256, temperature=0.15)
        #keywords = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=256, temperature=0.15)
        keywords = core.inference.gpt3_api(prompt, 'gpt-3.5-turbo-instruct', max_tokens=256, temperature=0.15)

        keywords = keywords.strip()
        keywords = self.strip_opening_quotes(keywords)

        # remove period if it is the last character
        if keywords[-1] == '.':
            keywords = keywords[:-1]

        return keywords

    def generate_title_for_shownotes(self, shownotes, example_titles=[], language='English'):
        '''
        This function generates a title for the episode.
        '''

        # Generate a high-quality default title for the episode
        prompt = f"""
Based on the podcast episode show notes below write a title for the episode in {language}. Do not include any language that is not {language}.

[START SHOW NOTES]
        """

        # take the first 3000 words of shownotes while maintaining formatting
        shownotes = shownotes.replace('\n', '{{{newline}}}')
        # shownotes = shownotes.split()[:1000]
        # shownotes = ' '.join(shownotes)
        shownotes = self.truncate_text_by_number_of_tokens(input_text=shownotes, desired_num_tokens=1300)
        shownotes = shownotes.replace('{{{newline}}}', '\n')

        prompt += "\n" + shownotes

        prompt += """
[END SHOW NOTES]
        """

        if len(example_titles) > 0:
            prompt += "\n\n" + "Example episode titles from this podcaster for previous episodes:\n\n"
            for example_title in example_titles:
                if example_title is not None:
                    prompt += example_title + "\n"
            prompt += "\nWhen writing the title, use the same style and tone as the examples above, but ignore the episode number and season number in the example titles."

        prompt += "\n\n" + f"Title in {language}:"
        prompt = prompt.strip()

        #print(prompt)

        title = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=64, allow_fallback=True)

        title = title.strip()

        # remove beginning and ending quotes
        if title[0] == '"':
            title = title[1:]
        if title[-1] == '"':
            title = title[:-1]

        # remove period if it is the last character
        if title[-1] == '.':
            title = title[:-1]

        # Generate title variations for the episode

        variations_prompt = f"""
Based on the podcast episode show notes below suggest six alternative titles for the episode.
Follow these rules:
1. Write the titles in {language}. Do not include any language that is not {language}.
2. Put every episode title on a new line with no bullet points or numbering, just the title.
3. Vary the language used, structure, and theme of each title.
4. Avoid using the same exact words in the title as the original title.
5. Limit ':' or '-' punctuation in all of the titles.
6. Do not include the episode number or season number in the title suggestions.
7. Do not include the podcast name in the title suggestions.

[START SHOW NOTES]
        """

        variations_prompt += "\n" + "Current Title: " + title + "\n\n" + shownotes

        variations_prompt += """
[END SHOW NOTES]

Avoid ':' or '-' punctuation in all of the titles.
Be sure to put each title on a new line with no bullet points or numbering, for example:
This Is A Title with Guest Name
This Is Another Much Much Longer Title That Is Elaborate
This Is A Third Short Title
This Is Nice - A Fourth Title
This Is A Fifth Simple Title
This Is A, Sixth Title

"""

        if len(example_titles) > 0:
            variations_prompt += "\n\n" + "Example episode titles from this podcaster for previous episodes:\n\n"
            for example_title in example_titles:
                variations_prompt += example_title + "\n"
            variations_prompt += "\nWhen writing the alternative titles, use the same style and tone as the podcaster's previous episodes examples above, but ignore the episode number and season number in the example titles."

        variations_prompt = variations_prompt.strip()

        #print(variations_prompt)

        alternative_title = core.inference.gpt_chat_api_single_prompt(variations_prompt, 'gpt-4o', max_tokens=256, temperature=0.8)

        alternative_title = alternative_title.strip()

        # remove beginning and ending quotes
        if alternative_title[0] == '"':
            alternative_title = alternative_title[1:]
        if alternative_title[-1] == '"':
            alternative_title = alternative_title[:-1]

        # remove period if it is the last character
        if alternative_title[-1] == '.':
            alternative_title = alternative_title[:-1]

        titles = title + '\n' + alternative_title

        titles = titles.replace('Title: ', '')

        # remove extra newlines
        titles = titles.replace('\n\n', '\n')

        return titles

    def generate_full_key_points_from_summary(self, summary, language='English'):
        '''
        This function generates a full key points overview from a summary.
        '''
        prompt = f"'{summary}'\n\n"
        prompt += f"""
Restructure and simplify the above summary based on the example below.

For example, if the following was provided:
"In this podcast episode, the we discuss how language is a social construct and how different cultures adapt their language to the environment. The participants continue the conversation examining the role of language in human interaction and the way language affects perception. We delve into the connections between environment, perception, and language and how everything is interconnected. The episode is sponsored by HomeDepot."

You would write:
"Language is a social construct, and different cultures adapt their language to the environment. Language plays a role in human interaction and affects perception. Environment, perception, and language are interconnected."

Follow these rules:
1. Write the restructured text in {language}. Do not include any language that is not {language}.
1. REMOVE any and all mentions of the chapter
2. REMOVE any and all mentions of the podcast
3. REMOVE any and all mentions of the episode
4. REMOVE any and all mentions of the host or hosts
6. REMOVE any and all mentions of the participants
7. Do not mention any advertisements or sponsorships.
8. Begin by speaking directly to a topic.
9. Be concise. Do not use any words that are not needed.

Restructured text in {language}:
"""
        key_points_full = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=128)
        #key_points_full = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=128)

        key_points_full = key_points_full.strip()
        key_points_full = self.strip_opening_quotes(key_points_full)

        return key_points_full


    def generate_opening_techniques_for_show_notes(self, summary, language = 'English'):
        '''
        This function generates opening instructions for a show notes document.
        '''
        techniques = []

        technique = """
Technique: Posing a provocative question
Explanation: Use a thought-provoking question that intrigues your audience and makes them eager to find the answer by listening to your podcast episode.
Example: "What if you could double your income in just six months? Discover the secrets of successful entrepreneurs who've done it."
"""
        techniques.append(technique)

        technique = """
Technique: Bold statement
Explanation: Make a bold or controversial claim that challenges conventional wisdom or sparks curiosity in your audience.
Example: "The 9-5 workday is dead, and remote work is the future. Hear why experts predict this monumental shift will revolutionize the workforce."
"""
        techniques.append(technique)

        technique = """
Technique: Make a promise of what you'll learn
Explanation: Offer a guarantee or promise of what your audience will gain from the episode, making them eager to learn more.
Example: "Master the art of negotiation and never leave money on the table again in our exclusive interview with a top negotiation expert."
"""
        techniques.append(technique)

        technique = """
Technique: Personal story
Explanation: Share a relatable personal story or anecdote that draws your audience in and makes them curious to hear more.
Example: "After years of battling with crippling anxiety, Jill stumbled upon a life-changing coping strategy. Learn how it transformed her life, and how it could change yours too."
"""
        techniques.append(technique)

        technique = """
Technique: Highlight a guest
Explanation: Showcase an interesting or high-profile guest in your episode to attract listeners who are fans or curious about their insights.
Example: "World-renowned chef Jamie Oliver reveals his secret ingredient for a fulfilling life both in and out of the kitchen."
"""
        techniques.append(technique)

        technique = """
Technique: Tantalizing teaser
Explanation: Provide a brief and intriguing preview of an exciting moment or revelation from the episode that will leave your audience wanting more.
Example: "Hear how a simple shift in mindset led to a $10 million breakthrough for one struggling business owner."
"""
        techniques.append(technique)

        prompt = f"[START EPISODE INFO]\n'{summary}'\n\n[END EPISODE INFO]"
        prompt += f"""
[START WRITTING TECHNIQUES]
1. Posing a provocative question: This technique is best for content that encourages listener engagement, sparks curiosity, or discusses a common problem that the audience can relate to.

2. Opening with a bold statement: This approach is suitable for content that tackles controversial topics, presents unconventional ideas, or challenges the status quo, as it captures the attention of the listeners and sets a strong tone for the discussion.

3. Opening with a promise of what you'll learn: This method is ideal for content that is educational or instructional in nature, as it outlines the main takeaways, benefits, or insights that the listeners can expect to gain from the episode.

4. Opening with a personal story: Sharing a personal story is most effective for content that explores human experiences, emotions, or challenges, as it helps create a connection between the host and the audience.

5. Opening with a guest highlight: This technique works best for episodes featuring notable guests, as it emphasizes their expertise, achievements, or unique perspectives, drawing in listeners who are interested in the guest or the topic they'll be discussing.

6. Opening with a teaser: A teaser is perfect for content that has a suspenseful or exciting element, such as a mystery, a surprising revelation, or an exclusive interview, enticing listeners to stay tuned for more.
[END WRITTING TECHNIQUES]

Based on the episode information above, in particular the content and tone of the episode, specify the best way to write an announcement for the episode by ordering the techniques below from best to worst. Consider the episode's content and tone. Write the announcement in {language}. Do not include any language that is not {language}. Just specify the numbers, like 1,2,3...
"""

        techniques_ordered = []

        try:
            techniques_order = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=64, temperature=0.0)

            techniques_order = techniques_order.strip()
            techniques_order = self.strip_opening_quotes(techniques_order)

            techniques_order = techniques_order.split(',')
            techniques_order = [int(x) for x in techniques_order]

            for i in techniques_order:
                techniques_ordered.append(techniques[i-1])
        except:
            techniques_ordered = techniques

        return techniques_ordered

    # Experimental
    def polish_show_notes_summary(self, show_notes_summary, chapter_summaries, previous_critisims=[], max_rounds=7, bypass_judgement=False):
        '''
        This function polishes the show notes by recursively critiquing and editing the show notes.
        '''
        prompt = f"[START ORIGINAL CHAPTER OVERVIEWS - FOR REFERENCE]\n\"{chapter_summaries}\"\n[END ORIGINAL CHAPTER OVERVIEWS]\n\n"
        prompt += f"[START CURRENT SUMMARY]\n\"{show_notes_summary}\"\n[END CURRENT SUMMARY]\n\n"
        prompt += """
Your task is to provide a list of five criticisms for the above CURRENT podcast episode show notes opening summary.
The critisisms should be specific and serve to improve the summary.
Please provide the exact edits to be made.
Be brief and concise.
The original chapter overviews are provided for reference and to ensure that the summary is consistent with the content.
It's important that the show notes read as unique, interesting, and capture a potential listener's attention.
If the beginning of the summary is typical, consider suggesting a new beginning like a question, bold statement, personal story, guest highlight, or teaser - whichever is best given the content.
Anything cliche must be fixed. Consider the best way to start the summary given the content.
Be sure to fix any language that does not make sense from the perspective of a listener reading the summary.
Using the phrase "in this episode" or "in this conversation" is boring and should be fixed.
It's very important that the summary and suggestions not contain boring words like "dive", "delve", "explore", "embark" or repetitive language.
"""
        prompt += "\n\n[PREVIOUS CRITICISMS]\n"
        for criticism in previous_critisims:
            prompt += f"{criticism}\n\n"
        prompt += "\n\n[END PREVIOUS CRITICISMS]\n\n"
        prompt += "Be sure to provide a criticism that is different from the previous ones.\n\n"
        crit = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=512, temperature=0.7)
        #crit = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=512, temperature=0.7)

        crit = crit.strip()
        crit = self.strip_opening_quotes(crit)

        previous_critisims.append(crit)

        print(prompt)
        print(crit)
        print("------------------------------------------")

        prompt = f"[START ORIGINAL CHAPTER OVERVIEWS - FOR REFERENCE]\n\"{chapter_summaries}\"\n[END ORIGINAL CHAPTER OVERVIEWS]\n\n"
        prompt += f"[START CURRENT SUMMARY]\n\"{show_notes_summary}\"\n[END CURRENT SUMMARY]\n\n"
        prompt += """
Adjust the current podcast episode summary above based on the criticism below.
The original chapter overviews are provide for reference and to ensure that the summary is consistent with the content.
It's important that the show notes read as unique, interesting, and capture a potential listener's attention.
It's very important to not use boring, typical words like "dive", "delve", "explore", "embark" and repetitive language.
Do not add any new information to the summary that is not already in the original summary.
The new summary should have the same number of paragraphs as the original summary.
When making lists, be sure to include newlines between each list item.

Criticism:
"""
        prompt += f"{crit}\n\n"
        #prompt += "Adjusted summary:"


        if max_rounds > 1:
            #fixed_show_notes_summary = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=512, temperature=0.0)
            fixed_show_notes_summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=512, temperature=0.0)
        else:
            fixed_show_notes_summary = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=512, temperature=0.0)

        fixed_show_notes_summary = fixed_show_notes_summary.strip()
        fixed_show_notes_summary = self.strip_opening_quotes(fixed_show_notes_summary)

        print(prompt)
        print(fixed_show_notes_summary)
        print("------------------------------------------")

        judgement = ""
        if not bypass_judgement:
            prompt = "[Version 1]\n"
            prompt += f"\"{show_notes_summary}\"\n\n"
            prompt += "[Version 2]\n"
            prompt += f"\"{fixed_show_notes_summary}\"\n\n"
            prompt += """
Your task is to determine which version of the above texts most satisfies all of the following criteria:
- begins in an interesting way that will hook listeners
- avoids contain cliches
- makes sense when reading from a listener's perspective
- avoids boring, typical words like "dive", "delve", "explore", "embark"
- avoids repetitive language
- avoids "in this episode..."
- sparks listener interest

State the number of your selection (1 or 2) without explanation:
"""

            #judgement = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=16, temperature=0.0)
            judgement = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=16, temperature=0.0)

            print(prompt)
            print(judgement)
            print("------------------------------------------")

        if "1" in judgement and not bypass_judgement:
            return show_notes_summary
        else:
            max_rounds -= 1
            if max_rounds > 0:
                return self.polish_show_notes_summary(
                    fixed_show_notes_summary,
                    chapter_summaries=chapter_summaries,
                    max_rounds=max_rounds,
                    previous_critisims=previous_critisims,
                    bypass_judgement=bypass_judgement
                )
            else:
                return fixed_show_notes_summary

    def generate_short_key_points(self, full_key_points, language="English"):
        '''
        This function generates a one-sentence key points overview from a longer key points overview.
        '''
        prompt = f"\"{full_key_points}\"\n\n"
        #prompt += "Turn this into a short 20-word sentence. Don't use new words.\n\n Short 20-word sentence:"
        prompt += f"""
Re-write this into a short sentence about 20 words long, listing key points.
- Use {language} language. Do not include any language that is not {language}.
- Do not change the meaning.
- Avoid beginning the sentence with words ending in "ing".
- Simply write the topics discussed in a sentence form.
- Instead of writing "Exploring nature's..." or "Discussing nature's..." simply write "Nature's..."
- Instead of writing "We explore nature's..." or "We discuss nature's..." simply write "Nature's..."

For example, if the following was provided:
"In this podcast episode we discuss how language is a social construct and how different cultures adapt their language to the environment. The participants continue the conversation examining the role of language in human interaction and the way language affects perception. We delve into the connections between environment, perception, and language and how everything is interconnected. The episode is sponsored by HomeDepot."

You would write:
"Language is a social construct that plays a role in interaction and is interconnected with environment and perception."

Short sentence about 20 words long, listing key points:
"""

        #short_key_points = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-4o', max_tokens=64, temperature=0.0)
        #short_key_points = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=128, temperature=0.0)
        #short_key_points = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=128, temperature=0.0)
        short_key_points = core.inference.gpt3_api(prompt, 'gpt-3.5-turbo-instruct', max_tokens=128, temperature=0.0)

        short_key_points = short_key_points.strip()
        short_key_points = self.strip_opening_quotes(short_key_points)

        return short_key_points

    def strip_opening_quotes(self, text):
        '''
        This function strips opening quotes from a string.
        '''
        if text[0] == '"' or text[0] == "'":
            text = text[1:]
        if text[-1] == '"' or text[-1] == "'":
            text = text[:-1]
        return text

    def generate_tweet_for_shownotes(self, shownotes):
        '''
        This function generates a tweet for the episode.
        '''
        prompt = """
Based on the podcast episode show notes below, write a compelling tweet announcing the episode.

[START SHOW NOTES]
        """

        # take the first 3000 words of shownotes while maintaining formatting
        # shownotes = shownotes.replace('\n', '{{{newline}}}')
        # shownotes = shownotes.split()[:3000]
        shownotes = self.truncate_text_by_number_of_tokens(input_text=shownotes, desired_num_tokens=3900)
        shownotes = ' '.join(shownotes)
        shownotes = shownotes.replace('{{{newline}}}', '\n')

        prompt += "\n" + shownotes

        prompt += """
[END SHOW NOTES]

Tweet:
        """

        prompt = prompt.strip()

        tweet = core.inference.gpt_chat_api_single_prompt(prompt, 'gpt-3.5-turbo-16k', max_tokens=128)
        #tweet = core.inference.gpt3_api(prompt, 'text-davinci-003', max_tokens=128)

        tweet = tweet.strip()

        # remove beginning and ending quotes
        if tweet[0] == '"':
            tweet = tweet[1:]
        if tweet[-1] == '"':
            tweet = tweet[:-1]

        # remove period if it is the last character
        if tweet[-1] == '.':
            tweet = tweet[:-1]

        return tweet
