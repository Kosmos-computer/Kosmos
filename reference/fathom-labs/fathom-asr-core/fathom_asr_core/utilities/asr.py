from dataclasses import dataclass
import torch, torchaudio
import whisper
from pyannote.audio import Pipeline
from deepmultilingualpunctuation import PunctuationModel

from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

class Diarizer:
    #===========================================================================================================
    # Speaker diarization.
    #===========================================================================================================

    def __init__(self):
        self.pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization@2.1", use_auth_token="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")

    def get_diarization(self, wav_audio_path):
        diarization = self.pipeline(wav_audio_path)

        diarization_segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            diarization_segments.append({'start': turn.start, 'end': turn.end, 'speaker': speaker})

            mins_start = int(turn.start // 60)
            secs_start = turn.start % 60
            mins_end = int(turn.end // 60)
            secs_end = turn.end % 60
            # DEBUG
            # print(f"start= {mins_start}:{secs_start:.3f}, stop= {mins_end}:{secs_end:.3f} speaker_{speaker}")

        return diarization_segments

class Transcriber:
    #===========================================================================================================
    # whisper-v3. Audio transcription using the Fathom fine-tuned ASR model v2.
    #===========================================================================================================

    def __init__(self):
        '''
        best_of: Optional[int] = None     # number of independent samples to collect, when t > 0
        beam_size: Optional[int] = None   # number of beams in beam search, when t == 0 (leads to reapiting words)
        '''
        model_id = "openai/whisper-large-v3"
        torch_dtype = torch.float16
        device = "cuda:0"

        model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id, 
                                                               torch_dtype=torch_dtype, 
                                                               low_cpu_mem_usage=True, 
                                                               use_safetensors=True,
                                                            #    use_flash_attention_2=True  # Only supported on Ampera GPUs (RTX 30xx series, A100, etc., not supported on V100, P100 or g4dn instances) 
                                                               )
        model.to(device)

        processor = AutoProcessor.from_pretrained(model_id)

        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            max_new_tokens=128,
            chunk_length_s=30,
            batch_size=16,
            return_timestamps=True,
            torch_dtype=torch_dtype,
            device=device,
        )

    def get_transcript(self, audio_path, model = 'whisper_large', language_code = 'en'):

        if model == 'whisper_small' or model == 'whisper-large':
            transcript = self.pipe(audio_path, generate_kwargs={"language": language_code})

        else:
            raise ValueError(f'Unknown model: {model}')

        return transcript

# class Transcriber:
#     #===========================================================================================================
#     # Audio transcription using the Fathom fine-tuned ASR model v2.
#     #===========================================================================================================

#     def __init__(self):
#         '''
#         best_of: Optional[int] = None     # number of independent samples to collect, when t > 0
#         beam_size: Optional[int] = None   # number of beams in beam search, when t == 0
#         '''
#         self.whisper_large = whisper.load_model("large-v3")  # options: device=device, download_root=model_dir
#         # self.whisper_small = whisper.load_model("small")

#     def get_transcript(self, audio_path, model = 'whisper_large', language_code = 'en'):

#         if model == 'whisper_large':
#             whisper_model = self.whisper_large
#         # elif model == 'whisper_small':
#         #     whisper_model = self.whisper_small
#         else:
#             raise ValueError(f'Unknown model: {model}')
        
#         result = whisper_model.transcribe(audio_path, language=language_code, beam_size=5)  #, best_of=5, beam_size=5 or patience=2, beam_size=5
#         segments = result['segments']
#         print('YYYYYYYYYYYYYYYYYYYYYYY')
#         print('large-v3 segments:')
#         texto = ''
#         for segment in segments:
#             texto += segment['text']
#         print(texto)

#         return segments

class Aligner:
    #===========================================================================================================
    # Forced alignment.
    #===========================================================================================================

    def __init__(self):
        self.bundle = torchaudio.pipelines.WAV2VEC2_ASR_LARGE_LV60K_960H
        self.ASR_model_bundle = self.bundle.get_model().to('cuda')

    def get_alignment(self, transcription, chunk_wav_audio_path):
        # print()
        # print(transcription)
        # print(chunk_wav_audio_path)
        labels = self.bundle.get_labels()
        with torch.inference_mode():
            waveform, _ = torchaudio.load(chunk_wav_audio_path)
            emissions, _ = self.ASR_model_bundle(waveform.to('cuda'))
            emissions = torch.log_softmax(emissions, dim=-1)

        emission = emissions[0].cpu().detach()

        transcript = transcription.replace(" ", "|")
        transcript = transcript.upper()

        dictionary = {c: i for i, c in enumerate(labels)}

        tokens = [dictionary[c] for c in transcript]

        def get_trellis(emission, tokens, blank_id=0):
            num_frame = emission.size(0)
            num_tokens = len(tokens)

            # Trellis has extra diemsions for both time axis and tokens.
            # The extra dim for tokens represents <SoS> (start-of-sentence)
            # The extra dim for time axis is for simplification of the code.
            trellis = torch.full((num_frame + 1, num_tokens + 1), -float("inf"))
            trellis[:, 0] = 0
            for t in range(num_frame):
                trellis[t + 1, 1:] = torch.maximum(
                    # Score for staying at the same token
                    trellis[t, 1:] + emission[t, blank_id],
                    # Score for changing to the next token
                    trellis[t, :-1] + emission[t, tokens],
                )
            return trellis

        trellis = get_trellis(emission, tokens)

        @dataclass
        class Point:
            token_index: int
            time_index: int
            score: float

        def backtrack(trellis, emission, tokens, blank_id=0):
            # j and t are indices for trellis, which has extra dimensions
            # for time and tokens at the beginning.
            # When referring to time frame index 'T' in trellis,
            # the corresponding index in emission is 'T-1'.
            # Similarly, when referring to token index 'J' in trellis,
            # the corresponding index in transcript is 'J-1'.
            j = trellis.size(1) - 1
            t_start = torch.argmax(trellis[:, j]).item()

            path = []
            for t in range(t_start, 0, -1):
                # emission[J-1] is the emission at time frame 'J' of trellis dimension.
                # Score for token staying the same from time frame J-1 to T.
                stayed = trellis[t - 1, j] + emission[t - 1, blank_id]
                # Score for token changing from C-1 at T-1 to J at T.
                changed = trellis[t - 1, j - 1] + emission[t - 1, tokens[j - 1]]

                # Store the path with frame-wise probability.
                prob = emission[t - 1, tokens[j - 1] if changed > stayed else 0].exp().item()
                # Return token index and time index in non-trellis coordinate.
                path.append(Point(j - 1, t - 1, prob))

                # Update the token
                if changed > stayed:
                    j -= 1
                    if j == 0:
                        break
            else:
                raise ValueError("Failed to align")
            return path[::-1]


        path = backtrack(trellis, emission, tokens)

        # Merge the labels
        @dataclass
        class Segment:
            label: str
            start: int
            end: int
            score: float

            def __repr__(self):
                return f"{self.label}\t({self.score:4.2f}): [{self.start:5d}, {self.end:5d})"

            @property
            def length(self):
                return self.end - self.start

        def merge_repeats(path):
            i1, i2 = 0, 0
            segments = []
            while i1 < len(path):
                while i2 < len(path) and path[i1].token_index == path[i2].token_index:
                    i2 += 1
                score = sum(path[k].score for k in range(i1, i2)) / (i2 - i1)
                segments.append(
                    Segment(
                        transcript[path[i1].token_index],
                        path[i1].time_index,
                        path[i2 - 1].time_index + 1,
                        score,
                    )
                )
                i1 = i2
            return segments

        segments = merge_repeats(path)

        # Merge words
        def merge_words(segments, separator='|'):
            words = []
            i1, i2 = 0, 0
            while i1 < len(segments):
                if i2 >= len(segments) or segments[i2].label == separator:
                    if i1 != i2:
                        segs = segments[i1:i2]
                        word = ''.join([seg.label for seg in segs])
                        score = sum(seg.score * seg.length for seg in segs) / sum(seg.length for seg in segs)
                        words.append(Segment(word, segments[i1].start, segments[i2-1].end, score))
                    i1 = i2 + 1
                    i2 = i1
                else:
                    i2 += 1
            return words

        word_segments = merge_words(segments)

        def compute_segment(i):
            ratio = waveform.size(1) / (trellis.size(0) - 1)
            word = word_segments[i]
            x0 = int(ratio * word.start)
            x1 = int(ratio * word.end)
            return [word.label, x0 / self.bundle.sample_rate, x1 / self.bundle.sample_rate]

        new_word_segment = []
        for item in range(len(word_segments)):
            new_word_segment.append(compute_segment(item))

        return new_word_segment
    
class Punctuation:
    #===========================================================================================================
    # Punctuation Model.
    #===========================================================================================================

    def __init__(self):
        self.punctuation_model = PunctuationModel()

    def fix_punctuations(self, context):
        return self.punctuation_model.restore_punctuation(context)  

