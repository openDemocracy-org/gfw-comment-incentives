'use strict';
require('dotenv').config()
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

// Cannot get env working for these paths
const mongoUrl = 'mongodb://localhost:27017'; 
const mongoProductionUrl = 'mongodb://srv-captain--coral-mongo:27017';
const SIGNING_SECRET = "empsec_fa0e94fca0c13666c96f01c09b3c3b4673e1bd37289d848411519f3c5f46eb81f610d0";
const crypto = require("crypto");
// Constants
const SERVICE_PORT = process.env.SERVICE_PORT || 8080;
const SERVICE_HOST = process.env.SERVICE_HOST || '0.0.0.0';
const MONGO_URL = mongoProductionUrl;

// App


const app = express();

const nunjucks = require('nunjucks');
nunjucks.configure('assets', {
    autoescape: false,
    express: app
});

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.raw({ type: "application/json" }))
app.use(express.static('public'))

const mongoClient = new MongoClient(MONGO_URL, { useUnifiedTopology: true });

// Initialize connection once
mongoClient.connect(function (err) {
    if (err) throw err;
    // Start the application after the database connection is ready
    app.listen(SERVICE_PORT, SERVICE_HOST);
});

app.get('/assets/client.js', function (req, res) {
    res.render('comment-x-client.js', {
        coralRootUrl: process.env.CORAL_ROOT_URL,
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

app.get('/assets/iframe.js', function (req, res) {
    res.render('comment-x-iframe.js', {
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

app.get('/data/wallets.json', async function (req, res) {
    const docs = await getAllDocs('wallets')
    res.json(docs)
})

app.get('/data/comments/*', async function (req, res) {
    const slug = req.originalUrl.split('/data/comments/')[1].split('.json')[0]
    const docs = await getAllDocs(`${slug}-comments`)
    res.json(docs)
})

app.get('/data/authors/*', async function (req, res) {
    const slug = req.originalUrl.split('/data/authors/')[1].split('.json')[0]
    const docs = await getAllDocs(`${slug}-authors`)
    res.json(docs)
})

app.get('/data/chosen/*', async function (req, res) {
    const slug = req.originalUrl.split('/data/chosen/')[1].split('.json')[0]
    const docs = await getAllDocs(`${slug}-chosen`)
    res.json(docs)
})


async function handleHighlightedComment(comment, sentDetails) {
    const highlightedCommentCandidate = {
        author_id: comment.author.id,
        commenter_id: sentDetails.commenter_id
    }
    let storyUrl = getStoryUrlFromComment(comment)
    let storySlug = getSlugFromUrl(storyUrl)

    let allComments = await getAllDocs(`${storySlug}-comments`)
    const chosenComment = allComments.filter(comment => comment.comment.body.includes(sentDetails.commenter_comment.substr(1, 20)))
    highlightedCommentCandidate.chosen_comment = chosenComment[0]
    let fileName = `${storySlug}-chosen`
    addToDb(fileName, highlightedCommentCandidate);
}


function handleAuthorCandidate(comment, sentDetails) {
    let storyUrl = getStoryUrlFromComment(comment)
    let storySlug = getSlugFromUrl(storyUrl)
    let toStore = {
        [sentDetails.uuid]: comment.author.id
    }
    let fileName = `${storySlug}-authors`;
    addToDb(fileName, toStore);

}

function handleNewWallet(comment, sentDetails) {
    let toStore = {
        [sentDetails.wallet]: comment.author.id
    }
    addToDb('wallets', toStore)
}

function getStoryUrlFromComment(reqBody) {
    return reqBody.story.url
}

function getSlugFromUrl(urlString) {
    let urlParts = urlString.split('/')
    let slug = urlParts[urlParts.length - 2]
    return slug
}

app.post("/handle-comment", (req, res) => {
    let storyUrl = getStoryUrlFromComment(req.body)
    let storySlug = getSlugFromUrl(storyUrl)
    try {
        let body = req.body.comment.body
        let b1 = body.split('<div>')[1]
        let b2 = b1.split('</div>')[0]
        let b3 = b2.split('<br>')[0]
        let sentJson = JSON.parse(b3)
        if (sentJson.event_name === 'HIGHLIGHT_COMMENT') {
            handleHighlightedComment(req.body, sentJson)
            res.json({ status: 'REJECTED' });
        } else if (sentJson.event_name === 'NEW_WALLET') {
            handleNewWallet(req.body, sentJson)
            res.json({ status: 'REJECTED' });
        } else if (sentJson.event_name === 'AUTHOR_CANDIDATE') {
            handleAuthorCandidate(req.body, sentJson)
            res.json({ status: 'REJECTED' });
        } else {
            throw new Error('Not in the list')
        }

    } catch (e) {
        addToDb(`${storySlug}-comments`, req.body)
        res.json({ received: true });
    }

});

app.post('/create-story', (req, res) => {
    // Possible DB config here in future
})

async function addToDb(collection, content) {
    const db = mongoClient.db('gfw-service')
    const result = await db.collection(collection).insertOne(content)
}

async function getAllDocs(collection) {
    const db = mongoClient.db('gfw-service')
    let docs = []
    const cursor = db.collection(collection).find({});
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        docs.push(doc)
    }
    return docs
}

console.log(`Running on http://${SERVICE_HOST}:${SERVICE_PORT}`);