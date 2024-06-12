document.addEventListener("DOMContentLoaded", function() {
    const CLEAN_ARTICLE_ENDPOINT = '/clean-article';
    const DEFAULT_RSS_URL = '/rss-feed';
    const CUSTOM_RSS = "customRSSFeeds";
    const CORS_PROXY = "/proxy-rss?url=";
    let articles = [];

    function getRSSFeeds() {
        const feeds = localStorage.getItem(CUSTOM_RSS);
        return feeds ? JSON.parse(feeds) : [DEFAULT_RSS_URL];
    }

    function saveRSSFeeds(feeds) {
        localStorage.setItem(CUSTOM_RSS, JSON.stringify(feeds));
    }

    function fetchAllRSS() {
        const feeds = getRSSFeeds();
        articles = [];
        feeds.forEach(feed => fetchRSS(feed));
    }

    function fetchRSS(feedUrl) {
        if (feedUrl == DEFAULT_RSS_URL){
            fetch(feedUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(data, "text/xml");
                processRSS(xmlDoc);
                renderCategories();
                renderArticles();
            })
            .catch(error => console.log('Error fetching RSS feed:', error));
        } else {
            fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(data, "text/xml");
                processRSS(xmlDoc);
                renderCategories();
                renderArticles();
            })
            .catch(error => console.log('Error fetching RSS feed:', error));
        }
    }

    function processRSS(xmlDoc) {
        const items = xmlDoc.getElementsByTagName("item");
        const feedTitle = xmlDoc.getElementsByTagName("title")[0].textContent;

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let link = item.getElementsByTagName("link")[0].textContent;
            let title = item.getElementsByTagName("title")[0].textContent;
            let description = item.getElementsByTagName("description")[0].textContent;
            let pubDate = new Date(item.getElementsByTagName("pubDate")[0].textContent);
            let author = item.getElementsByTagName("author")[0].textContent;
            let category = item.getElementsByTagName("category")[0]?.textContent || 'Uncategorized';

            let truncatedTitle = title.length > 57 ? title.substring(0, 57) + '...' : title;
            let truncatedDescription = description.length > 160 ? title.substring(0, 160) + '...' : description;

            let mediaContent = item.getElementsByTagNameNS("*", "content")[0];
            let imageUrl = mediaContent ? mediaContent.getAttribute("url") : null;


            articles.push({
                feedTitle,
                title: truncatedTitle,
                link,
                description: truncatedDescription,
                pubDate,
                category,
                imageUrl,
                author
            });
        }

        // Sort articles by date (newest first)
        articles.sort((a, b) => b.pubDate - a.pubDate);
    }

    async function fetchCleanedArticle(url) {
        try {
            let response = await fetch(CLEAN_ARTICLE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            let data = await response.json();
            return data.content || 'Content could not be retrieved.';
        } catch (error) {
            console.error('Error fetching cleaned article:', error);
            return 'Content could not be retrieved.';
        }
    }

    function renderCategories() {
        const categories = [...new Set(articles.map(article => article.category))];
        const categoryFilter = document.getElementById("categoryFilter");
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';

        categories.forEach(category => {
            let option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        categoryFilter.addEventListener("change", renderArticles);
    }

    function renderArticles() {
        const contentDiv = document.getElementById("content");
        contentDiv.innerHTML = ''; // Clear existing content

        const selectedCategory = document.getElementById("categoryFilter").value;

        const filteredArticles = selectedCategory === 'all'
            ? articles
            : articles.filter(article => article.category === selectedCategory);

        filteredArticles.forEach(article => {
            let articleElement = document.createElement("article");

            if (article.imageUrl) {
                let imgElement = document.createElement("img");
                imgElement.src = article.imageUrl;
                imgElement.alt = article.title;
                imgElement.addEventListener('click', () => {
                    window.open(article.link, '_blank');
                });
                articleElement.appendChild(imgElement);
            }

            let titleElement = document.createElement("h2");
            let titleLink = document.createElement("a");
            titleLink.href = article.link;
            titleLink.textContent = article.title;
            titleLink.target = "_blank";
            titleElement.appendChild(titleLink);
            articleElement.appendChild(titleElement);

            let descriptionElement = document.createElement("p");
            let descriptionLink = document.createElement("a");
            descriptionLink.href = article.link;
            descriptionLink.innerHTML = article.description;
            descriptionLink.target = "_blank";
            descriptionElement.appendChild(descriptionLink);
            articleElement.appendChild(descriptionElement);

            let footerElement = document.createElement("footer");
            footerElement.textContent = article.author + "   \uD83D\uDCC5 " + article.pubDate.toDateString();
            articleElement.appendChild(footerElement);
            
            let pillElement = document.createElement("pill");
            pillElement.textContent = article.feedTitle;
            articleElement.appendChild(pillElement);

            articleElement.addEventListener("click", () => openModal(article.link));
            contentDiv.appendChild(articleElement);
        });
    }

    async function openModal(url) {
        const modal = document.getElementById("article-modal");
        const modalBody = document.getElementById("modal-body");

        console.log(url);

        let cleanedContent = await fetchCleanedArticle(url);
        modalBody.innerHTML = cleanedContent;

        modal.style.display = "flex";

        const closeButton = document.querySelector(".close");
        closeButton.onclick = function() {
            modal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    }

    function validateURL(url) {
        const pattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?$/;
        return pattern.test(url);
    }

    function initRSSManagement() {
        const rssInput = document.getElementById("rss-url");
        const addRSSButton = document.getElementById("add-rss");
        const removeRSSButton = document.getElementById("remove-rss");
        const rssList = document.getElementById("rss-list");

        function populateRSSList() {
            const feeds = getRSSFeeds();
            rssList.innerHTML = '';
            let option = document.createElement("option");
            option.value = "";
            option.hidden = true;
            option.textContent = "Choose Feed to remove";
            rssList.appendChild(option);
            feeds.forEach(feed => {
                if (feed != DEFAULT_RSS_URL) {
                    let option = document.createElement("option");
                    option.value = feed;
                    option.textContent = feed;
                    rssList.appendChild(option);
                }
            });
        }

        addRSSButton.addEventListener("click", () => {
            const newFeed = rssInput.value.trim();
            if (newFeed && validateURL(newFeed) && !getRSSFeeds().includes(newFeed)) {
                const feeds = getRSSFeeds();
                feeds.push(newFeed);
                saveRSSFeeds(feeds);
                populateRSSList();
                fetchAllRSS();
                rssInput.value = '';
            }
        });

        removeRSSButton.addEventListener("click", () => {
            const selectedFeed = rssList.value;
            if (selectedFeed && selectedFeed !== DEFAULT_RSS_URL) {
                const feeds = getRSSFeeds().filter(feed => feed !== selectedFeed);
                saveRSSFeeds(feeds);
                populateRSSList();
                fetchAllRSS();
            }
        });

        populateRSSList();
    }

    initRSSManagement();
    fetchAllRSS();
});
