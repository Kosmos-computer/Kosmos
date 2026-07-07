// @ts-nocheck
const { Router } = require('express');
const Parser = require('rss-parser');
const axios = require('axios');

const router = Router();
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['itunes:duration', 'itunesDuration'],
      ['itunes:episode', 'itunesEpisode'],
      ['itunes:summary', 'itunesSummary'],
    ],
  },
});

router.get('/episodes', async (req, res) => {
  try {
    const url = (req.query.url || '').toString().trim();
    if (!url) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    // Some hosts (e.g., Megaphone) require a proper User-Agent and may block default fetchers
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'PodbookBot/1.0 (+https://podbook.ai) Node.js RSS Fetcher',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Encoding': 'gzip, deflate'
      },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const xml = typeof response.data === 'string' ? response.data : response.data?.toString?.() || '';

    if (!xml) {
      return res.status(400).json({ error: 'Empty RSS response' });
    }

    const feed = await parser.parseString(xml);

    const episodes = (feed.items || []).map((item, index) => ({
      id: item.guid || item.id || item.link || `episode-${index}`,
      title: item.title || 'Untitled episode',
      link: item.enclosure?.url || null,
      pubDate: item.pubDate || item.isoDate || null,
      duration: item.itunesDuration || (item.itunes && item.itunes.duration) || null,
      description: item.itunesSummary || item.contentSnippet || null,
    }));

    return res.json({
      title: feed.title || null,
      image: (feed.itunes && feed.itunes.image) || (feed.image && feed.image.url) || null,
      episodes,
    });
  } catch (error) {
    const message = (error && (error.response?.status + ' ' + (error.response?.statusText || '')))
      || error?.message
      || 'Unknown error';
    console.error('Failed to parse RSS:', message);
    return res.status(400).json({ error: 'Failed to fetch or parse RSS feed', details: message });
  }
});

module.exports = router;


