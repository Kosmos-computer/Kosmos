
import fathom_asr_core as core
import aiohttp

access_secret_params = {
    'access_secret':core.env['inference_api_access_secret']
}

inference_api_url = core.env['inference_api_url']

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
