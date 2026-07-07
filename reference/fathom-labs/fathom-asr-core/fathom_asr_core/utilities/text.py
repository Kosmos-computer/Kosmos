import fathom_asr_core as core
import spacy
import re
import num2words
import unidecode

class Text:

    def __init__(self):

        self.nlp = spacy.load('en_core_web_sm')
        self.allowed_in_sentence_dots = ['Mr.', 'Mrs.', 'Dr.', 'No.', 'St.', 'Co.', 'Jr.', 'Maj.', 'Gen.', 'Drs.', 'Rev.', 'Lt.', 'Hon.', 'Sgt.', 'Capt.', 'Esq.', 'Ltd.', 'Col.', 'Ft.', \
                        'Ms.', 'Messrs.', 'Prof.', 'Sen.', 'Rep.', 'Gov.', 'Pres.', 'Sens.', 'Reps.', 'Sec.', 'Attys.', 'Messrs.', 'Messrs.', 'Messrs.', 'Messrs.', \
                        'etc.']

    def segment_splitter(self, text):
        '''
        This function splits an arbitrary large text into sentences.
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

    def dots_treatments(self, segment):
        '''
        In order to facilitate future applications that rely on sentences or paragraphs segmentations,
        the dots and question marks will always indicate End Of Sentence, except when found in the 
        allowed_in_sentence_dots listed above, in float numbers and in links ending in .com.

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
                        # if any(char.isdigit() for char in word) and '.' in word:
                        #     print('YYYOOOOEEE CHECK THIS dot in WORD')
                        #     print(word)
                        if '.' in word and not any(char.isdigit() for char in word):
                            # remove comma from word just for analysis:
                            word_without_comma = word.replace(',', '')
                            if word_without_comma not in self.allowed_in_sentence_dots and '.co' not in word_without_comma: # Most of the time .com is at the end of the sentence.
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

    def replace_currency_symbols_from_reverted_numberizer(self, no_numbers_word):
        '''
        Whisper outputs special characters for some currency symbols and percent.
        the rest of currency symbols seems to be spelled out.
        https://github.com/openai/whisper/blob/main/whisper/normalizers/english.py

        "percent": "%"
        "pounds": "£"
        "euros": "€"
        "dollars": "$"
        "cents": "¢"
        '''
        if '$' in no_numbers_word or '¢' in no_numbers_word or '£' in no_numbers_word or '€' in no_numbers_word or '%' in no_numbers_word:
            if '%' in no_numbers_word:
                new_no_numbers_word = no_numbers_word.replace('%', ' percent ')
            else:
                if '$' in no_numbers_word:
                    new_no_numbers_word = no_numbers_word + ' dollars'
                    new_no_numbers_word = new_no_numbers_word.replace('$', '')
                elif '¢' in no_numbers_word:
                    new_no_numbers_word = no_numbers_word + ' cents'
                    new_no_numbers_word = new_no_numbers_word.replace('¢', '')
                elif '£' in no_numbers_word:
                    new_no_numbers_word = no_numbers_word + ' pounds'
                    new_no_numbers_word = new_no_numbers_word.replace('£', '')
                elif '€' in no_numbers_word:
                    new_no_numbers_word = no_numbers_word + ' euros'
                    new_no_numbers_word = new_no_numbers_word.replace('€', '')

            new_no_numbers_word = re.sub(' +', ' ', new_no_numbers_word)
            new_no_numbers_word = new_no_numbers_word.strip()
        else:
            new_no_numbers_word = no_numbers_word

        return new_no_numbers_word

    def security_checks(self, no_numbers_word):
        '''
        JUST IN CASE, SECURITY CHECKS:
        - Stripping weird accents from characters (ö -> o):
        - Any non predicted special character will be stripped.
        - If for some reason, some allowed special character (% $ ¢ £ €) 
            is found withour any number around, it will be spelled out.
        '''

        no_numbers_word = unidecode.unidecode(no_numbers_word)
        no_numbers_word = re.sub(r'[^a-zA-Z\s\'\%\$\¢\£\€]', '', no_numbers_word)
        no_numbers_word = re.sub('-', ' ', no_numbers_word)
        no_numbers_word = re.sub('%', 'percent', no_numbers_word)
        no_numbers_word = re.sub('\$', 'dollars', no_numbers_word)
        no_numbers_word = re.sub('¢', 'cents', no_numbers_word)
        no_numbers_word = re.sub('£', 'pounds', no_numbers_word)
        no_numbers_word = re.sub('€', 'euros', no_numbers_word)
        no_numbers_word = re.sub(' +', ' ', no_numbers_word)
        no_numbers_word = no_numbers_word.strip()

        return no_numbers_word


    def cleaning_and_revert_numberizer(self, segment):
        '''
        This function will keep the original 'word' for final display and
        generate a "naked segment" to be used in the forced alignment.
        The final segment will only contain the following characters:
         . , ? % $ ¢ £ € - and ' 
        (the rest will be spelled out, as expected from english whisper output). 
        '''
        segment_with_replacements = []
        for word in segment.split():
            if any(char.isdigit() for char in word):
                # 'no_numbers_word' will only be composed by ' and letters.
                #new_word = self.remove_commas_from_number(word)
                no_numbers_word = word
                no_numbers_word = re.sub('-', ' ', no_numbers_word)
                no_numbers_word = re.sub(r'[\,\?]', '', no_numbers_word)
                no_numbers_word = re.sub(r'[\.]', ' ', no_numbers_word)
                no_numbers_word = re.sub(r"(\d+)", lambda x: num2words.num2words(int(x.group(0))), no_numbers_word)
                no_numbers_word = no_numbers_word.replace('-', ' ')
                '''
                output (enough for the forced alignment):
                30s -> thirtys
                10% -> ten%
                $50,000. -> $fifty thousand.
                2.4 -> two.four
                45 -> forty-five
                ...
                '''
                # no_numbers_word = self.remove_punctuations_from_reverted_numberizer(no_numbers_word)
                no_numbers_word = self.replace_currency_symbols_from_reverted_numberizer(no_numbers_word)
            else:
                no_numbers_word = word

            no_numbers_word = self.security_checks(no_numbers_word)

            segment_with_replacements.append({'original': word, 'replacement': no_numbers_word})

        # print(segment_with_replacements)
        return segment_with_replacements

    def clean_whisper_segment(self, segment):
        '''
        Segments example:

        it's not accurate, but if I go in tomorrow and I do 1,300,
        it's not accurate, but if I go in tomorrow and I do one,three hundred,

        I want to say, between a 28 and 93% overestimation
        I want to say, between a twenty-eight and ninety-three% overestimation

        and they'll see, okay, they burn 400 calories.
        and they'll see, okay, they burn four hundred calories.

        to get to the Krebs cycle, either being through acetyl-CoA,
        to get to the Krebs cycle, either being through acetyl-CoA,

        or through glucose going through glycolysis to pyruvate.
        or through glucose going through glycolysis to pyruvate.

        if the food labels can be 20% off,
        if the food labels can be twenty% off,
        '''

        #SECURITY CHECKS:
        segment = segment.replace('!', '.')
        #remove '-' from segment:
        #segment = segment.replace('-', ' ')        
        #remove extra spaces using re:
        segment = re.sub(' +', ' ', segment)
        segment = segment.strip()

        # if '.' in segment[:-1] and any(char.isdigit() for char in segment):
        # if '$' in segment or '%' in segment or '£' in segment or '€' in segment or '¢' in segment:
            # print()
            # print(segment)
        segment = self.dots_treatments(segment)
        segment_with_replacements = self.cleaning_and_revert_numberizer(segment)

        return segment_with_replacements

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

            # At least 200 words after the query are needed.
            if len(' '.join(context_next).split()) >= 200:
                context = ' '.join(context_previous + context_next)

                chunk = await core.inference.previews([{'query': query, 'context': context}])
                chunk = chunk['previews'][0]
                chunk = chunk.replace(" ,", ",")
                chunk = chunk.replace(" .", ".")
                chunk = chunk.replace(" ?", "?")

                full_chunk = ''
                for j in range(i,len(sentences)):
                    full_chunk = full_chunk + ' ' + sentences[j]
                    full_chunk = full_chunk.replace(" ,", ",")
                    full_chunk = full_chunk.replace(" .", ".")
                    full_chunk = full_chunk.replace(" ?", "?")
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

    def get_sentences(self, custom_transcript=None):
        '''
        "custom_transcript" can be used, for instance, to break 
        down a monologue into sentences and then into paragraphs.
        '''
        if not custom_transcript:
            self.load_content()
            content = self.content
        else:
            content = custom_transcript

        sentence = {}
        sentences = []
        text = ''
        start = True
        for monologue in content['monologues']:
            current_speaker = monologue['speaker']
            for element in monologue['elements']:
                # There are three element['type']: punct, text and unknown
                if element['type'] != 'unknown':
                    # there are 4 puntuation types: '.' ',' '?' and ' '
                    # there is always a space after '.' in the current data set
                    if start and element['type'] == 'text':
                        sentence['start'] = element['ts']
                        word_elements = []
                        start = False

                    if element['type'] == 'text':
                        word_elements.append({
                            'speaker': current_speaker,
                            'value': element['value'],
                            'start': element['ts'],
                            'end': element['end_ts']
                        })
                    elif element['value'] != " ":
                        if element['value'] == " .":
                            word_elements.append({
                                'speaker': current_speaker,
                                'value': '.'
                            })
                        else:
                            word_elements.append({
                                'speaker': current_speaker,
                                'value': element['value']})

                    # There is no "!" in any trnscript
                    if element['value'] != '.' and element['value'] != '?':
                        text += element['value']
                        if element['type'] == 'text':
                            end_ts = element['end_ts']
                    else:
                        text += element['value']
                        if text[0] == ' ':
                            text = text[1:]
                        if ' .' in text:
                            text = text.replace(" .",".")
                            text = text.replace(",.",".")

                        # This fixes some minor issues ralated to extra blank spaces
                        text_split = text.split()
                        text = ' '.join(text_split)

                        sentence['end'] = end_ts
                        sentence['content'] = text
                        sentence['word_elements'] = word_elements

                        if text != '' and text != '.':
                            sentences.append(sentence)
                        text = ''
                        sentence = {}
                        start = True
        return sentences


        # def expand_abbreviations(texto):
        #     texto = texto.replace('Mr.', 'Mister')
        #     texto = texto.replace('Mrs.', 'Misess')
        #     texto = texto.replace('Dr.', 'Doctor')
        #     texto = texto.replace('No.', 'Number')
        #     texto = texto.replace('St.', 'Saint')
        #     texto = texto.replace('Co.', 'Company')
        #     texto = texto.replace('Jr.', 'Junior')
        #     texto = texto.replace('Maj.', 'Major')
        #     texto = texto.replace('Gen.', 'General')
        #     texto = texto.replace('Drs.', 'Doctors')
        #     texto = texto.replace('Rev.', 'Reverend')
        #     texto = texto.replace('Lt.', 'Lieutenant')
        #     texto = texto.replace('Hon.', 'Honorable')
        #     texto = texto.replace('Sgt.', 'Sergeant')
        #     texto = texto.replace('Capt.', 'Captain')
        #     texto = texto.replace('Esq.', 'Esquire')
        #     texto = texto.replace('Ltd.', 'Limited')
        #     texto = texto.replace('Col.', 'Colonel')
        #     texto = texto.replace('Ft.', 'Fort')

