const { search } = require('youtube-search-without-api-key');
const ytsr = require('ytsr');

async function test() {
  const query = 'Taylor Swift Anti-Hero official music video';
  console.log(`🔍 Testing providers for: "${query}"\n`);

  // Provider 1: youtube-search-without-api-key
  try {
    console.log('--- Provider: youtube-search-without-api-key ---');
    const results = await search(query);
    if (results && results.length > 0) {
      const best = results[0];
      console.log(`✅ Found: ${best.title}`);
      console.log(`   ID: ${best.id.videoId}`);
      console.log(`   Channel: ${best.snippet.channelTitle}`);
    } else {
      console.log('❌ No results');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  console.log('\n');

  // Provider 2: ytsr
  try {
    console.log('--- Provider: ytsr ---');
    const searchResults = await ytsr(query, { limit: 5 });
    const videos = searchResults.items.filter(i => i.type === 'video');
    if (videos.length > 0) {
      const best = videos[0];
      console.log(`✅ Found: ${best.title}`);
      console.log(`   ID: ${best.id}`);
      console.log(`   Channel: ${best.author.name}`);
    } else {
      console.log('❌ No results');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test().catch(console.error);
