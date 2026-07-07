import datetime
​
def profile_start(description):
    profile_object = {
        'description': description,
        'start': datetime.datetime.now(),
        'end': None
    }
    
    return profile_object
    
def profile_end(profile_object):
    profile_object['end'] = datetime.datetime.now()
    profile_object['delta'] = profile_object['end'] - profile_object['start']
    profile_object['total_milliseconds'] = profile_object['delta'].total_seconds() * 1000
    
    print(f"PROFILE: {profile_object['description']} took {profile_object['total_milliseconds']} milliseconds")
    
    return profile_object
​
# ------------------------------------------------------------------------------
​
import librosa
import soundfile as sf
import os
import gc
import sox
import torch
import numpy as np
​
from transformers import Wav2Vec2ForCTC, Wav2Vec2Tokenizer
model_name = "facebook/wav2vec2-large-960h-lv60-self"
model = Wav2Vec2ForCTC.from_pretrained(model_name).to("cuda")
tokenizer = Wav2Vec2Tokenizer.from_pretrained(model_name)
​
​
from transformers import T5Tokenizer, T5ForConditionalGeneration
model_name = "flexudy/t5-small-wav2vec2-grammar-fixer"
fix_model = T5ForConditionalGeneration.from_pretrained(model_name).to("cuda")
fix_tokenizer = T5Tokenizer.from_pretrained(model_name)
​
# ------------------------------------------------------------------------------
​
fathom_asr_start = profile_start("FATHOM ASR")
​
# ------------------------------------------------------------------------------
​
start = profile_start("Transform MP3 Audio")
audio_transformer = sox.Transformer()
audio_transformer.convert(samplerate=16000, n_channels=1)
audio_transformer.build_file(os.path.realpath('audio/test2.mp3'), os.path.realpath('audio/test2.wav'))
profile_end(start)
​
# ------------------------------------------------------------------------------
​
start = profile_start("Load WAV Audio")
#y, s = librosa.load('audio/test2.wav')
y, s = librosa.load('audio/test2.wav', sr=None)
#y, s = librosa.load('audio/test2.mp3', sr=16000)
#y_mono = librosa.to_mono(y)
y_mono = y
profile_end(start)
​
# ------------------------------------------------------------------------------
​
start = profile_start("Calculate Chunks")
noise_intervals = librosa.effects.split(y_mono, top_db=2.5, frame_length=16000, hop_length=50)
​
silence_intervals = []
for index, noise_interval in enumerate(noise_intervals):
    silence_interval = {
        'start': None,
        'end': None
    }
    if len(silence_intervals) == 0:
        silence_interval['start'] = 0
        silence_interval['end'] = noise_interval[0]
    else:
        silence_interval['start'] = noise_intervals[index-1][1]
        silence_interval['end'] = noise_interval[0]
    
    print(silence_interval)
    silence_intervals.append(silence_interval)
    
print(len(silence_interval))
​
​
# ------------------------------------------------------------------------------
​
chunked_intervals = []
​
start_sample_position = 0
last_end_sample_position = 0
length_seconds = 30
for silence_interval in silence_intervals:
    if (silence_interval['start'] - start_sample_position) > (length_seconds * 16000):
        if (start_sample_position == last_end_sample_position):
            last_end_sample_position = start_sample_position + (length_seconds * 16000)
​
        chunked_interval = {
            'start': start_sample_position,
            'end': last_end_sample_position
        }
        chunked_intervals.append(chunked_interval)
        
        start_sample_position = last_end_sample_position - 400
​
    last_end_sample_position = silence_interval['start']
​
chunked_interval = {
    'start': start_sample_position,
    'end': len(y_mono)
}
chunked_intervals.append(chunked_interval)
​
for chunked_interval in chunked_intervals:
    print(chunked_interval['start'])
    print(chunked_interval['end'])
    print((chunked_interval['end'] - chunked_interval['start']) / 16000)
    print('---')
​
profile_end(start)
    
# ------------------------------------------------------------------------------
​
def transcribe(speech):
    with torch.no_grad():
        inputs = tokenizer([speech], return_tensors="pt", padding="longest").input_values.to("cuda")
​
        logits = model(inputs).logits
​
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = tokenizer.batch_decode(predicted_ids)
        
        gc.collect()
        torch.cuda.empty_cache()
    
        return transcription
​
# ------------------------------------------------------------------------------
    
#def fix(text):
#    with torch.no_grad():
#        input_text = "fix: { " + text + " } </s>"
#
#        input_ids = fix_tokenizer.encode(input_text, return_tensors="pt", max_length=256, truncation=True, add_special_tokens=True).to("cuda")
#    
#        outputs = fix_model.generate(
#            input_ids=input_ids,
#            max_length=256,
#            num_beams=4,
#            repetition_penalty=1.0,
#            length_penalty=0.5,
#            early_stopping=True
#        )
#
#        sentence = fix_tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=True)
#        
#        gc.collect()
#        torch.cuda.empty_cache()
#    
#        return sentence
    
# ------------------------------------------------------------------------------
import subprocess
#python3 align.py ../audio/chunk_0.wav ../audio/chunk_0.txt -o ../audio/chunk_0_align.json
​
transcription_chunks = []
lm_transcription_chunks = []
fixed_transcription_chunks = []
for index, chunked_interval in enumerate(chunked_intervals):
    print('*******************************************************************')
    
    start = profile_start("Write WAV")
    #librosa.output.write_wav(f"data/chunk_{index}.wav", y_mono[chunked_interval['start']:chunked_interval['end']], 16000)
    sf.write(f"audio/chunk_{index}.wav", y_mono[chunked_interval['start']:chunked_interval['end']], 16000)
    profile_end(start)
    
    start = profile_start("Transcribe")
    transcription = transcribe(y_mono[chunked_interval['start']:chunked_interval['end']])
    transcription = transcription[0].lower()
    transcription_chunks.append(transcription)
    
    with open(f"audio/chunk_{index}.txt", "w") as text_file:
        text_file.write(transcription)
        
    #subprocess.check_output(['python3', 'gentle/align.py', f"../audio/chunk_{index}.wav", f"../audio/chunk_{index}.txt", '-o', f"../audio/chunk_{index}.json"])
    os.system(f"python3 gentle/align.py audio/chunk_{index}.wav audio/chunk_{index}.txt -o audio/chunk_{index}_align.json")    
    #alignment = pyfoal.align(transcription, y_mono[chunked_interval['start']:chunked_interval['end']], 16000)
    #print(alignment)
    print(transcription)
    profile_end(start)
​
    print('--------------------------------------------------------------------')
    
    #start = profile_start("Beam Search")
    #logits = torch.nn.functional.log_softmax(logits.cpu().float(), dim=-1)
    #lm_transcription = decoder.decode_batch(logits)
    #lm_transcription_chunks.append(lm_transcription)
    #print(lm_transcription)
    #print('~~~')
    #profile_end(start)
    
    print('--------------------------------------------------------------------')
    
    #start = profile_start("Fix")
    #fixed_transcription = fix(transcription)
    #if (len(fixed_transcription) > (len(transcription) * 1.20)) or (len(fixed_transcription) < (len(transcription) * .8)):
    #    fixed_transcription_chunks.append(transcription.lower())
    #else:
    #    fixed_transcription_chunks.append(fixed_transcription)
    #print(fixed_transcription)
    #print('~~~')
    #profile_end(start)
​
# ------------------------------------------------------------------------------
​
import spacy
import en_core_web_lg
# python -m spacy download en_core_web_lg
spacy_nlp_fast = en_core_web_lg.load(disable=['tagger', 'textcat', 'ner', 'lemmatizer'])
​
start = profile_start("Sentences")
transcription_sentences = [sent.text for sent in spacy_nlp_fast(' '.join(transcription_chunks)).sents]
profile_end(start)
​
#for transcription_chunk in transcription_chunks:
#    print(transcription_chunk)
​
​
#print('*******************************************************************')
#print('*******************************************************************')
#print('*******************************************************************')
#print(' '.join(fixed_transcription_chunks))
print('*******************************************************************')
print('*******************************************************************')
print('*******************************************************************')
print(' '.join(transcription_chunks))
print('*******************************************************************')
print('*******************************************************************')
print('*******************************************************************')
for sentence in transcription_sentences:
    print(sentence.capitalize() + '.')
​
​
profile_end(fathom_asr_start)
