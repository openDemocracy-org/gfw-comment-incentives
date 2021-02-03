'use strict';
require('dotenv').config()
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet')

const MongoClient = require('mongodb').MongoClient;

// Constants
const SERVICE_PORT = process.env.SERVICE_PORT || 4000;
const SERVICE_HOST = process.env.SERVICE_HOST || '0.0.0.0';
const MONGO_URL = process.env.MONGO;

// App
const app = express();

const nunjucks = require('nunjucks');
nunjucks.configure('assets', {
    autoescape: false,
    express: app
});
app.use(helmet())
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
    res.set('content-type', 'text/javascript')
    res.render('comment-x-client.js', {
        pageRootUrl: process.env.PAGE_ROOT_URL,
        coralRootUrl: process.env.CORAL_ROOT_URL,
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

function getSlugFromUrl(req, path) {
    return req.originalUrl.split(path)[1].split('.json')[0]
}

app.get('/assets/iframe.js', function (req, res) {
    res.set('content-type', 'text/javascript')
    res.render('comment-x-iframe.js', {
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

app.get('/data/all-wallets.json', async function (req, res) {
    const docs = await getAllDocs('wallets')
    res.json(docs)
})

app.get('/data/wallets/*', async function (req, res) {
    const serviceDb = mongoClient.db('gfw-service')
    let authorCoralId = null;
    let commenterCoralId = null;

    try {
        const slug = req.originalUrl.split('/data/wallets/')[1].split('.json')[0]

        authorCoralId = req.query.author;
        const cursor = await serviceDb.collection(`${slug}-chosen`).find({ author_id: authorCoralId })

        let docsHighlightedByAuthor = [];
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            docsHighlightedByAuthor.push(doc)
        }
        if (docsHighlightedByAuthor.length > 0) { // Got at least one highlighted comment, let's get commenter ID

            let firstHighlightedComment = docsHighlightedByAuthor[0]
            let commentId = firstHighlightedComment.comment_id.split('comment-')[1]
            const coralDb = mongoClient.db('coral')
            const coralCursor = await coralDb.collection('comments').find({ id: commentId })
            let coralDocs = [];
            while (await coralCursor.hasNext()) {
                const doc = await coralCursor.next()
                coralDocs.push(doc)
            }
            if (coralDocs.length > 0) {
                let highlightedComment = coralDocs[0]
                commenterCoralId = highlightedComment.authorID;
            }
        }
        getWallets(res, authorCoralId, commenterCoralId)
    } catch (e) {
        console.log(e)
        res.send(e)
    }

    async function getWallets(res, authorId, commenterId) {

        let commenterWalletDoc = null;
        let authorWalletDoc = await getFirstDocById(serviceDb, 'wallets', authorId)
        if (commenterId)
            commenterWalletDoc = await getFirstDocById(serviceDb, 'wallets', commenterId)

        let gotWallet = authorWalletDoc ? true : commenterWalletDoc ? true : false;

        let response = {
            gotWallet
        }
        if (authorWalletDoc)
            response.authorWallet = authorWalletDoc.wallet
        if (commenterWalletDoc)
            response.commenterWallet = commenterWalletDoc.wallet

        res.send(response)
    }

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
    const replace = {
        author_id: comment.author.id
    };
    addToDbReplaceAll(fileName, highlightedComment, replace);
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
        [sentDetails.wallet]: comment.author.id,
        _id: comment.author.id,
        wallet: sentDetails.wallet
    }
    let toReplace = {
        _id: comment.author.id,
    }
    console.log(toStore, toReplace)
    addToDbReplaceAll('wallets', toStore, toReplace)
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

    try {
        let body = req.body.comment.body
        let b1 = body.slice(5)
        let b2 = b1.slice(0, -10)
        let openingContainer = 'commenter_comment":'
        let openingPosition = b2.indexOf(openingContainer)
        if (openingPosition > -1) {
            let openingPositionStart = openingPosition + openingContainer.length + 1
            let closingContainer = ',"timestamp'
            let closingPosition = b2.indexOf(closingContainer) - 1
            let comment = JSON.stringify(b2.slice(openingPositionStart, closingPosition))
            let firstHalf = b2.split(openingContainer)[0] + openingContainer
            let secondHalf = closingContainer + b2.split(closingContainer)[1]
            b2 = firstHalf + comment + secondHalf
        }
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
            // Not in list, must be OK
            res.json({ received: true });
        }
    } catch (e) {
        // Reject any errors
        console.log(e)
        res.json({ status: 'REJECTED' });
    }

});

app.post('/create-story', (req, res) => {
    // Possible DB config here in future
})

async function addToDbReplaceAll(collection, content, replace) {
    const db = mongoClient.db('gfw-service')

    try {
        await db.collection(collection).deleteMany(replace)
    } catch (e) {
        console.log(e)
    }

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

async function getFirstDocById(db, collection, id) {
    const cursor = await db.collection(collection).find({ _id: id })
    let docs = []
    while (await cursor.hasNext()) {
        const doc = await cursor.next()
        docs.push(doc)
    }
    return docs[0]
}

console.log(`Running on http://${SERVICE_HOST}:${SERVICE_PORT}`);