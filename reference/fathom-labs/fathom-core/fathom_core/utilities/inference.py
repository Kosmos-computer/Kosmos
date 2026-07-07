import fathom_core as core
import re
import requests
import asyncio
import aiohttp
import openai
from tenacity import retry, stop_after_attempt, wait_exponential

openai.api_key = core.env['open_ai_api_key']

access_secret_params = {
    'access_secret':core.env['inference_api_access_secret']
}
inference_api_url = core.env['inference_api_url']

async def question_answer_with_workers(questions, chunk_size=10):
    groups = list(core.utility.chunk(questions, chunk_size))

    tasks = []
    for group in groups:
        inference = question_answer(group)
        tasks.append(inference)

    results = await asyncio.gather(*tasks)

    items = [item for group in results for item in group['answers']]

    response = {
        'answers': items
    }
    return response

async def question_answer(questions):
    url = get_inference_api_url() + '/question/answer'
    payload = {
        'questions': questions
    }

    #profile = app.profiler.start("Inference Question Answer")
    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            #app.profiler.end(profile)
            return await response.json()

async def text_analyze_with_workers(texts, perform, chunk_size=5):
    groups = list(core.utility.chunk(texts, chunk_size))

    tasks = []
    for group in groups:
        inference = text_analyze(group, perform)
        tasks.append(inference)

    results = await asyncio.gather(*tasks)

    items = [item for group in results for item in group['analyses']]

    response = {
        'analyses': items
    }
    return response


async def text_analyze(texts, perform):
    url = get_inference_api_url() + '/text/analyze'
    payload = {
        'texts': texts,
        'perform': perform
    }

    #profile = app.profiler.start("Inference Question Answer")
    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            #app.profiler.end(profile)
            return await response.json()

async def text_entities(text):
    response = requests.get(
        get_inference_api_url() + '/text/entities',
        json={
            'text': text
        },
        params=access_secret_params
    )

    return response.json()['entities']

async def text_embedding_vectors_with_workers(texts, chunk_size=10):
    groups = list(core.utility.chunk(texts, chunk_size))

    tasks = []
    for group in groups:
        inference = text_embedding_vectors(group)
        tasks.append(inference)

    results = await asyncio.gather(*tasks)

    items = [item for group in results for item in group['embedding_vectors']]

    response = {
        'embedding_vectors': items
    }
    return response

async def text_embedding_vectors(texts):
    url = get_inference_api_url() + '/text/embedding/vector'
    payload = {
        'texts': texts
    }

    #profile = app.profiler.start("Inference Question Answer")
    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            #app.profiler.end(profile)
            return await response.json()

async def text_embedding_vector(text):
    response = await text_embedding_vectors([text])
    return response['embedding_vectors'][0]

async def short_clip(query, context):
    url = get_inference_api_url(2) + '/clips_previews/short_clip'
    payload = {
        'query_and_context': {
            'query': query,
            'context': context
        }
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            return await response.json()

async def medium_clip(query, context):
    url = get_inference_api_url(2) + '/clips_previews/medium_clip'
    payload = {
        'query_and_context': {
            'query': query,
            'context': context
        }
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            return await response.json()

@retry(stop=stop_after_attempt(15), wait=wait_exponential(multiplier=1, min=4, max=32))
def gpt_chat_api_single_prompt(prompt, model, system_message=None, max_tokens = 20, temperature = 1.0, top_p=1.0, frequency_penalty = 0, presence_penalty = 0, logit_bias={}, timeout=80, source=None, purpose=None, allow_fallback=False):        
    #print('---')
    #print("GPT CHAT API")
    #print(model)
    #print(len(prompt.split(' ')))

    messages = []
    if system_message:
        messages.append({"role": "system", "content": system_message})
    messages.append({"role": "user", "content": prompt})
    
    
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            timeout=timeout,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            logit_bias=logit_bias,
            stop=""
        )

        #print('Input Tokens:', response.usage.prompt_tokens)
        #print('Output Tokens:', response.usage.completion_tokens)
        #print('---')
    except Exception as e:
        if allow_fallback and model != 'gpt-3.5-turbo-16k':
            return gpt_chat_api_single_prompt(prompt=prompt, model='gpt-3.5-turbo-16k', system_message=system_message, max_tokens=max_tokens, temperature=temperature, top_p=top_p, frequency_penalty=frequency_penalty, presence_penalty=presence_penalty, logit_bias=logit_bias, timeout=timeout, source=source, purpose=purpose)
        ##log_ai_api_failure(model, source, purpose, e)
        #print(e)
        raise e

    return response.choices[0].message.content

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=32))
def gpt_chat_api_single_prompt_stream(prompt, model, max_tokens = 20, temperature = 0.7, top_p=1.0, frequency_penalty = 0, presence_penalty = 0, timeout=80, source=None, purpose=None):
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            timeout=timeout,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            stop="",
            stream=True
        )

        for chunk in response:
            yield chunk
    except Exception as e:
        ##log_ai_api_failure(model, source, purpose, e)
        raise e

@retry(stop=stop_after_attempt(15), wait=wait_exponential(multiplier=1, min=4, max=32))
def gpt3_api(prompt, model, max_tokens = 20, temperature = 0.7, frequency_penalty = 0, presence_penalty = 0, best_of = 1, logit_bias={}, timeout=45, source=None, purpose=None):
    #print('---')
    #print("GPT3 API")
    #print(model)
    #print(len(prompt.split(' ')))

    try:
        response = openai.Completion.create(
            engine=model,
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=1,
            timeout=timeout,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            best_of=best_of,
            logit_bias=logit_bias,
            stop=""
        )

        #print('Input Tokens:', response.usage.prompt_tokens)
        #print('Output Tokens:', response.usage.completion_tokens)
        #print('---')
    except Exception as e:
        ##log_ai_api_failure(model, source, purpose, e)
        #print(e)
        raise e

    return response.choices[0].text

def simplify_title(title):

    keep_hints = [
        {
            'original': "'Dear Sugars Presents: Hot And Bothered'",
            'formatted': "'Dear Sugars Presents: Hot And Bothered'"
        },
        {
            'original': "'Acquired Episode 17: Waze'",
            'formatted': "'Acquired: Waze'"
        },
        {
            'original': "'Steve McIntosh Part 1: Cultural Intelligence and the Roots of Polarization'",
            'formatted': "'Steve McIntosh Part 1: Cultural Intelligence and the Roots of Polarization'"
        },
        {
            'original': "'Episode 42: Supporting People (what to do and what not to do)'",
            'formatted': "'Supporting People (what to do and what not to do)'"
        },
    ]

    change_hint_groups = [
        [
            {
                'original': "'Master Stress: Tools for Managing Stress & Anxiety | Episode 10'",
                'formatted': "'Master Stress: Tools for Managing Stress & Anxiety'"
            },
            {
                'original': "'This Week in Startups Australia hosted by Mark Pesce | Season 9 Episode 1 with Jason Calacanis'",
                'formatted': "'This Week in Startups Australia hosted by Mark Pesce'"
            },
            {
                'original': "'InPresence 0222: Forms of Life After Death with Jeffrey Mishlove'",
                'formatted': "'InPresence: Forms of Life After Death with Jeffrey Mishlove'"
            },
        ],
        [
            {
                'original': "'E28: Current state of public & private markets, Archegos debacle, US debt issues, wealth tax & more'",
                'formatted': "'Current state of public & private markets, Archegos debacle, US debt issues, wealth tax & more'"
            },
            {
                'original': "'E29: Coinbase goes public, direct listings vs. IPOs, portfolio management, unions & more with Bestie Guestie Brad Gerstner'",
                'formatted': "'Coinbase goes public, direct listings vs. IPOs, portfolio management, unions & more with Bestie Guestie Brad Gerstner'"
            },
            {
                'original': "'Growth | Scaling Your Startup S2 E1 with Growth University’s Craig Zingerline and Fitbod’s Allen Chen | E1198'",
                'formatted': "'Growth | Scaling Your Startup with Growth University’s Craig Zingerline and Fitbod’s Allen Chen'"
            },
        ],
        [
            {
                'original': "'Acquired Episode 16: Midroll + Stitcher (acquired by Scripps)'",
                'formatted': "'Acquired: Midroll + Stitcher (acquired by Scripps)'"
            },
            {
                'original': "'Episode 18: Special—An Acquirer’s View into M&A with Taylor Barada, head of Corp Dev at Adobe'",
                'formatted': "'Special—An Acquirer’s View into M&A with Taylor Barada, head of Corp Dev at Adobe'"
            },
            {
                'original': "'Episode 1: Pixar'",
                'formatted': "'Pixar'"
            },
            {
                'original': "'Episode 33: Overture (with the Internet History Podcast!)'",
                'formatted': "'Overture (with the Internet History Podcast!)'"
            },
        ],
        [
            {
                'original': "'Season 3, Episode 8: Netflix (Part 1)'",
                'formatted': "'Netflix (Part 1)'"
            },
            {
                'original': "'Season 4, Episode 3: Instagram Revisited'",
                'formatted': "'Instagram Revisited'"
            },
            {
                'original': "'Season 2, Episode 3: Nest'",
                'formatted': "'Nest'"
            },
        ],
        [
            {
                'original': "'Degrading Drugs for Problem Proteins: Journal Club now on Bio Eats World (ep 2)'",
                'formatted': "'Degrading Drugs for Problem Proteins: Journal Club now on Bio Eats World'"
            },
        ]
    ]

    keep_prompt = ''
    for keep_hint in keep_hints:
        keep_prompt += f"Original {keep_hint['original']}\nFormatted {keep_hint['formatted']}\n\n"

    simplified_titles = []
    for change_hint_group in change_hint_groups:
        try:
            change_prompt = ''
            for change_hint in change_hint_group:
                change_prompt += f"Original {change_hint['original']}\nFormatted {change_hint['formatted']}\n\n"

            prompt = keep_prompt
            prompt += change_prompt
            prompt += f"Original '{title}'\nFormatted"

            response = openai.Completion.create(
              engine="ada",
              prompt=prompt,
              temperature=0,
              max_tokens=50,
              top_p=1,
              frequency_penalty=0,
              presence_penalty=0,
              stop=["\n"]
            )

            #print(prompt)
            #print('---')
            #print(response.choices[0].text)

            simplified_titles.append(response.choices[0].text)
        except:
            pass

    # find shortest simplification (prefer no numbers)
    shortest_simplified_title = title
    for simplified_title in simplified_titles:
        if len(simplified_title) < len(shortest_simplified_title) and not any(char.isdigit() for char in simplified_title):
            shortest_simplified_title = simplified_title

    if shortest_simplified_title == title:
        for simplified_title in simplified_titles:
            if len(simplified_title) < len(shortest_simplified_title):
                shortest_simplified_title = simplified_title

    # remove prompt formatting
    if len(shortest_simplified_title) > 5:
        if shortest_simplified_title[0] == " " and shortest_simplified_title[1] == "'":
            shortest_simplified_title = shortest_simplified_title[2:]
        if shortest_simplified_title[-1:] == "'":
            shortest_simplified_title = shortest_simplified_title[:-1]
    else:
        shortest_simplified_title = None

    # ensure it's the same title (no nueral-net strangeness)
    if shortest_simplified_title:
        alpha_only = re.compile('[^a-zA-Z\s]')
        alpha_full_title = alpha_only.sub('', title)
        parts = alpha_only.sub('', shortest_simplified_title).split(' ')
        for part in parts:
            if part not in alpha_full_title:
                shortest_simplified_title = None
                break

    return shortest_simplified_title


def get_inference_api_url(cluster_number=1):
    if cluster_number == 1:
        return inference_api_url
    else:
        return inference_api_url.replace("inference-api", f"inference-api-{cluster_number}")

async def previews(query_and_context_list):
    # context_and_query_list = [{
    #        'query': 'three concatenated sentences with the query in the middle', 
    #        'context': 'text up to 3500 words'
    #         }, ...]
    url = get_inference_api_url(2) + '/clips_previews/previews'
    payload = {
        'query_and_context_list': query_and_context_list
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            return await response.json()

async def topical_break_scores(samples):
    # samples format: [{'topic_1': topic_1, 'topic_2': topic_2},...]
    url = get_inference_api_url(2) + '/text/topical_segmentation/scores'
    payload = {
        'samples': samples
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(url,json=payload,params=access_secret_params) as response:
            return await response.json()

def categorize_episode_search_query_intent(query):
    try:
        restart_sequence = "\n"
        response = openai.Completion(request_timeout=2.0).create(
            model="gpt-3.5-turbo-instruct",
            prompt=f"The following is a list of search queries and the search intent category of the queries.\n\nCategories:\n1. Podcast Episode Title Search\n2. Podcast  + Topic Search\n3. Podcast Search\n4. Person Search\n5. Person + Topic Search\n6. Topic\n7. Question\n\nSearch Query: \"{query}\"\nSearch Intent Category Number:",
            temperature=0,
            max_tokens=1,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            stop=["\n"]
        )

        category = response.choices[0].text.strip()
    
        return int(category)
    except:
        return 0
