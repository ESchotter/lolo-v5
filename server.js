const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const RSS_URL = 'https://flipboard.com/@raimoseero/feed-nii8kd0sz.rss';
const MERCURY_API_URL = 'https://uptime-mercury-api.azurewebsites.net/webparser';

app.use(cors());
app.use(express.static('public'));

app.get('/rss-feed', async (req, res) => {
    try {
        const response = await axios.get(RSS_URL);
        res.set('Content-Type', 'application/rss+xml');
        res.send(response.data);
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
        res.status(500).send('Error fetching RSS feed');
    }
});

app.post('/clean-article', express.json(), async (req, res) => {
    const { url } = req.body;

    try {
        const response = await axios.post(MERCURY_API_URL, { url });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching cleaned article:', error);
        res.status(500).send('Error fetching cleaned article');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
