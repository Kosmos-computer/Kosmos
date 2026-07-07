import fathom_asr_core as core
import subprocess
import requests
import librosa
import math
import numpy as np

#length_seconds = 15000

def request_as_browser(url, stream=False, timeout=5):
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
    return requests.get(url, headers=headers, stream=stream, timeout=timeout)

def download_file(url, temp_file_path='', local_filename=None):
    if local_filename is None:
        local_filename = url.split('/')[-1]
        
    file_path = temp_file_path + '/' + local_filename
    # NOTE the stream=True parameter below
    with request_as_browser(url, stream=True) as r:
        r.raise_for_status()
        with open(file_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192): 
                # If you have chunk encoded response uncomment if
                # and set chunk_size parameter to None.
                #if chunk: 
                f.write(chunk)
    return file_path

def mp3_to_wav(mp3_input_path, wav_output_path):
    '''
    ===========================================================================================================
    Converting mp3 to wav. FFMPEG seems to be faster than Fox.
    ===========================================================================================================

    Using Sox:
    audio_transformer = sox.Transformer()
    audio_transformer.convert(samplerate=16000, n_channels=1)
    audio_transformer.build_file(os.path.realpath(mp3_audio_path), os.path.realpath(f'{self.wav_chunks_output}/{episode}.wav'))
    '''
    subprocess.call(["ffmpeg", "-y",                       # -y overwrite
                    "-i", f"{mp3_input_path}",
                    "-v", "quiet",
                    "-ar", "16000",                       # -ar: sample rate
                    "-ac", "1",                           # -ac: Number of channels
                    "-acodec", "pcm_s16le",
                    "-f", "wav",
                    f"{wav_output_path}"])

    return None

def check_non_silent_intervals_lenghts(non_silent_intervals):
    '''
    The Convolution in the feature encoder of whisper input layer will fail if
    the audio is less than 640 frames.
    '''
    new_non_silent_intervals = []
    new_index = 0

    for index, non_silent_interval in enumerate(non_silent_intervals):
        if index > 0:
            if non_silent_interval[1] - non_silent_interval[0] <= 640:
                new_non_silent_intervals[new_index-1]['end'] = non_silent_interval[1]
            else:
                new_non_silent_intervals.append({'start': non_silent_interval[0], 'end': non_silent_interval[1]})
                new_index += 1
        else:
            new_non_silent_intervals.append({'start': non_silent_interval[0], 'end': non_silent_interval[1]})
            new_index += 1

    # If the first audio part is less than 30 seconds, it is merged with the second audio part:
    if new_non_silent_intervals[0]['end'] - new_non_silent_intervals[0]['start'] <= 640:
        new_non_silent_intervals[1]['start'] = new_non_silent_intervals[0]['start']
        new_non_silent_intervals.pop(0)
    
    return new_non_silent_intervals

def get_non_silent_intervals(raw_audio, length_seconds):
    '''    
    ===========================================================================================================
    length_seconds: minimum duration of the audio chunks in seconds.

    Finding non-silent intervals.
    
    Determine the non-silent intervals. The silence threshold will be gradually decreased 
    by 10% of the maximum decibels, until getting all chunks of audio with less than 15s 
    of duration.
    
    "Frame_lenght" is the size of the slidding window used to compute the Fourier Transformations.
    For speech processing it should be about 20 ms, while about 90 ms for music. 
    (Ref. https://link.springer.com/content/pdf/bbm%3A978-3-319-49220-9%2F1.pdf)
    --------------------
            20 ms
      10ms  --------------------
                   --------------------
                           -------------------- 
    
    Therefore: 20 ms of samples = frame_length/16000, => frame_length=320
    
    Hop_lenght is size of the slidding window, it should be about ~10 ms for speech 
    precessing => hop_length=160
    ===========================================================================================================
    '''
    frame_length   = 320
    hop_length     = 160
    max_desibels = 80.0

    # Gradually decreasing the silence threshold.
    thresholds = [max_desibels*x for x in [x/10 for x in range(9,0,-1)]]
    all_good = False
    for threshold in thresholds:
        if not all_good:
            non_silent_intervals = librosa.effects.split(raw_audio, top_db=threshold, frame_length=frame_length, hop_length=hop_length, ref=np.max)
            for interval in non_silent_intervals:
                if (interval[1] - interval[0])/16000 < length_seconds:
                    all_good = True
                else:
                    all_good = False
                    break

    non_silent_intervals = check_non_silent_intervals_lenghts(non_silent_intervals)

    return non_silent_intervals

def get_silent_intervals(noise_intervals, raw_audio):
    '''
    ===========================================================================================================
    Get the silence intervals from the non-silent intervals.
    ===========================================================================================================
    '''
    silence_intervals = []
    for index, noise_interval in enumerate(noise_intervals):
        if index == 0:
            if noise_interval['start'] != 0:
                silence_intervals.append({'start': 0, 'end': noise_interval['start']})  #(silence_interval)

        else:
            silence_intervals.append({'start': noise_intervals[index-1]['end'], 'end': noise_interval['start']})  #(silence_interval)

    if noise_intervals[-1]['end'] < len(raw_audio):
        silence_intervals.append({'start': noise_intervals[-1]['end'], 'end': len(raw_audio)})

    return silence_intervals

# def get_silent_intervals(noise_intervals):
#     '''
#     ===========================================================================================================
#     Defining the silence intervals, which will be used next 
#     to define the audio chunks.
#     ===========================================================================================================
#     '''
#     init = True
#     silence_intervals = []
#     short_sample = 0
#     for index, noise_interval in enumerate(noise_intervals):
#         silence_interval = {
#             'start': None,
#             'end': None
#         }
#         if init:
#             if noise_interval[0] != 0:
#                 # Convolution in the feature encoder will fail is less than 640 frames.
#                 if noise_interval[1] - noise_interval[0] > 640:
#                     silence_interval['start'] = 0
#                     silence_interval['end'] = noise_interval[0]
#                     silence_intervals.append(silence_interval)
#                     init = False
#             else:
#                 init = False
#         else:
#             # Convolution in the feature encoder will fail is less than 640 frames.
#             if noise_interval[1] - noise_interval[0] > 640:
#                 silence_interval['start'] = noise_intervals[index-short_sample-1][1]
#                 silence_interval['end'] = noise_interval[0]
#                 silence_intervals.append(silence_interval)
#                 short_sample = 0
#             else:
#                 short_sample += 1

#     return silence_intervals

def get_audio_parts(y_mono, silence_intervals, noise_intervals, length_seconds):
    '''
    ===========================================================================================================
    length_seconds: max duration of the audio chunks in seconds.
    Computing the audio chunks from the middle of a silent interval to 
    the middle of the next silent interval.
    ===========================================================================================================
    '''
    # if noise_intervals[-1][1] < len(y_mono):
    #     silence_interval = {
    #         'start': noise_intervals[-1][1],
    #         'end': len(y_mono)
    #         }
    #     silence_intervals.append(silence_interval)

    middle_points = []
    for i in range(len(silence_intervals)):
        middle_points.append({'middle':(silence_intervals[i]['start'] + silence_intervals[i]['end'])/2, 'length': silence_intervals[i]['end'] - silence_intervals[i]['start']})

    # Episode starts and ends in silence.
    if silence_intervals[0]['start'] == 0 and silence_intervals[-1]['end'] == len(y_mono):
        rango = range(1,len(middle_points)-1)
    # Episode starts in silence and ends with noise.
    elif silence_intervals[0]['start'] == 0 and silence_intervals[-1]['end'] < len(y_mono):
        rango = range(1,len(middle_points))
    # Episode starts with noise and ends in silence.
    elif silence_intervals[0]['start'] > 0 and silence_intervals[-1]['end'] == len(y_mono):
        rango = range(len(middle_points)-1)
    # Episode starts and ends with noise.
    elif silence_intervals[0]['start'] > 0 and silence_intervals[-1]['end'] < len(y_mono):
        rango = range(len(middle_points))

    audio_intervals = []

    last_middle_point = 0
    last_middle_point_index = 0

    count = 1
    max_silent_index = None
    for i in rango:
        middle_point = middle_points[i]['middle']
        if middle_point - last_middle_point > length_seconds*16000:
            maxi = -1
            max_silent_index = None
            half = math.ceil(count/2)
            # The largest silent interval from the second half of the chunk of audio
            # will be located to split the audio.
            if last_middle_point_index + half < i:
                for j in range(last_middle_point_index + half, i):
                    if middle_points[j]['length'] >= maxi:
                        max_silent_index = j
                        maxi = middle_points[j]['length']
            else:
                max_silent_index = last_middle_point_index + 1

            start_sample_position = last_middle_point
            end_sample_position = middle_points[max_silent_index]['middle']

            audio_chunk = {
                'start': int(start_sample_position),
                'end': int(end_sample_position)
            }
            audio_intervals.append(audio_chunk)

            last_middle_point = end_sample_position
            last_middle_point_index = max_silent_index
            count = i - max_silent_index + 1
        else:
            count += 1

    if max_silent_index:
        if max_silent_index < rango[-1]:
            start_sample_position = last_middle_point
            end_sample_position = middle_points[rango[-1]]['middle']

            audio_chunk = {
                'start': int(start_sample_position),
                'end': int(end_sample_position)
            }
            audio_intervals.append(audio_chunk)

            last_middle_point = end_sample_position
            last_middle_point_index = rango[-1]

        # Until the end.
        start_sample_position = last_middle_point
        end_sample_position = len(y_mono)
        
        audio_chunk = {
            'start': int(start_sample_position),
            'end': int(end_sample_position)
        }
        audio_intervals.append(audio_chunk)

    else:
        audio_intervals = [{
                'start': 0,
                'end': len(y_mono)
            }]
    return audio_intervals
