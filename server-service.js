'use strict';
require('dotenv').config()
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

// Constants
const SERVICE_PORT = process.env.SERVICE_PORT || 8080;
const SERVICE_HOST = process.env.SERVICE_HOST || '0.0.0.0';
const MONGO_URL = process.env.MONGO;

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
    const highlightedComment = {
        author_id: comment.author.id,
        ...sentDetails
    }
    let storyUrl = getStoryUrlFromComment(comment)
    let storySlug = getSlugFromUrl(storyUrl)

    let fileName = `${storySlug}-chosen`
    addToDbReplaceAll(fileName, highlightedComment);
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

        let b1 = body.slice(5)
        let b2 = b1.slice(0, -10)
        let sentJson = JSON.parse(b2)
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
        console.log(e)
        res.json({ received: true });
    }

});

app.post('/create-story', (req, res) => {
    // Possible DB config here in future
})

async function addToDbReplaceAll(collection, content) {
    const db = mongoClient.db('gfw-service')
    const doc = {
        author_id: content.author_id
    };
    await db.collection(collection).deleteMany(doc)
    await db.collection(collection).insertOne(content)
}

async function addToDb(collection, content) {
    const db = mongoClient.db('gfw-service')
    await db.collection(collection).insertOne(content)
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