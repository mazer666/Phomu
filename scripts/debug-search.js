const { search } = require('youtube-search-without-api-key');

async function debug() {
  const query = 'Daft Punk One More Time official music video';
  console.log(`🔍 Debugging: "${query}"`);

  try {
    const results = await search(query);
    console.log(`Found ${results ? results.length : 0} results.`);
    if (results && results.length > 0) {
      results.slice(0, 3).forEach((r, i) => {
        console.log(`[${i}] Title: ${r.title}`);
        console.log(`    Channel: ${r.snippet?.channelTitle}`);
        console.log(`    Snippet Title: ${r.snippet?.title}`);
        console.log(`    Snippet ID: ${r.id?.videoId}`);
      });
    } else {
      console.log('Results is empty or undefined.');
      console.log('Raw results:', JSON.stringify(results, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

debug().catch(console.error);
