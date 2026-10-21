// function to fetch and parse
async function fetchPodcastFeed(url) {
    try {
        // Fetch the RSS feed
        const response = await fetch(url);
        const text = await response.text();

        // Parse the RSS feed
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        // Extract podcast items
        const items = xmlDoc.querySelectorAll("item");
        const podcasts = [];

        items.forEach(item => {
            const title = item.querySelector("title").textContent;
            const description = item.querySelector("description").textContent;
            const link = item.querySelector("link").textContent;

            podcasts.push({ title, description, link });
        });

        return podcasts;
    } catch (error) {
        console.error("Error fetching or parsing the podcast feed:", error);
    }
}

//
const podcastFeedUrl = 'https://example.com/podcast/rss';
fetchPodcastFeed(podcastFeedUrl).then(podcasts => {
    console.log(podcasts);
});
