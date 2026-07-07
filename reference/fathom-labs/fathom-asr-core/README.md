

# Whispe-core

Considerations:
- In order to facilitate future applications that rely on sentences or paragraphs segmentations, the dots and question marks will always indicate End Of Sentence, except when found in the "allowed_in_sentence_dots" list indicated in utilities/test.py". \
    Dr. -> Dr. \
    Mr. -> Mr. \
    Jr. -> Jr. \
    ... \
    i.e. -> ie \
    p.m. -> pm \
    a.m. -> am \
    N.Y. -> NY \
    N.A.S.A. -> NASA \
    livmomentous.com -> livmomentous.com
    
  (The "allowed_in_sentence_dots" must be considered in the "transcript_files/get_sentences" function, because it uses dots and question marks to split texts.)

- Rev ai output format will be used.
- We will have only three punctuations: . , ?
- Words will be composed only by letters, ' and the following special charactres: % $ ¢ £ € -. The rest will be spelled out, as expected from english whisper output (https://github.com/openai/whisper/blob/main/whisper/normalizers/english.py).

## Requirements
- Python > 3.8

## Setup

## Run
```
python shell.py
```

## Whisper-coordinator/processing diagram:
<img width="1905" alt="Diagram_whisper" src="https://user-images.githubusercontent.com/44914422/211705108-b195746f-99a7-4ac1-a8b5-afd46946a0f5.png">

