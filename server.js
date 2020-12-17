'use strict';
require('dotenv').config()
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');
const SIGNING_SECRET = "empsec_fa0e94fca0c13666c96f01c09b3c3b4673e1bd37289d848411519f3c5f46eb81f610d0";
const crypto = require("crypto");
// Constants
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
// App
const app = express();
const nunjucks = require('nunjucks');
nunjucks.configure('views', {
    autoescape: false,
    express: app
});

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.raw({ type: "application/json" }))

// START Templating code just for POC
const slashes = require("connect-slashes");
function createHash(str) {
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

app.get('/articles/*', slashes(), function (req, res) {

    let protocol = process.env.PROTOCOL || 'https://'
    const pageFullUrl = protocol + req.get('host') + req.originalUrl;
    let pageSlugHash = createHash(req.originalUrl);
    pageSlugHash = pageSlugHash < 0 ? pageSlugHash * -1 : pageSlugHash;
    let coralAuthorId = req.query.caid
    let opts = {
        tabTitle: `${req.originalUrl} - od`,
        pageSlugHash: pageSlugHash,
        pageTitle: `An oD article with page slug ${req.originalUrl}`,
        pageFullUrl: pageFullUrl.includes('https://localhost') ? process.env.PAGE_ROOT_URL + req.originalUrl : pageFullUrl,
        pageRootUrl: process.env.PAGE_ROOT_URL,
        coralRootUrl: process.env.CORAL_ROOT_URL,
        coralAuthorId: coralAuthorId ? coralAuthorId : ''
    }


    res.render('coral.html', opts);
});

app.get('/assets/client.js', function (req, res) {
    res.render('client.js', {
        coralRootUrl: process.env.CORAL_ROOT_URL,
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

app.get('/assets/iframe.js', function (req, res) {
    res.render('iframe.js', {
        externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    });
})

function addToFile(fileName, message) {
    fs.readFile(`public/data/${fileName}-comments.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);
            // add a new record
            contents.push(JSON.parse(message));
            // write new data back to the file
            fs.writeFile(`public/data/${fileName}-comments.json`, JSON.stringify(contents, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}

function handleHighlightedComment(comment, sentDetails) {
    const highlightedCommentCandidate = {
        author_id: comment.author.id,
        commenter_id: sentDetails.commenter_id
    }
    let storyUrl = getStoryUrlFromComment(comment)
    let storySlug = getSlugFromUrl(storyUrl)
    fs.readFile(`public/data/${storySlug}-comments.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);

            const chosenComment = contents.filter(comment => comment.comment.body.includes(sentDetails.commenter_comment.substr(1, 20)))
            console.log(chosenComment)
            highlightedCommentCandidate.chosen_comment = chosenComment
            console.log(chosenComment)
            fs.writeFile(`public/data/${storySlug}-chosen.json`, JSON.stringify(highlightedCommentCandidate, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}


function handleAuthorCandidate(comment, sentDetails) {
    let storyUrl = getStoryUrlFromComment(comment)
    let storySlug = getSlugFromUrl(storyUrl)
    fs.readFile(`public/data/${storySlug}-authors.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            // parse JSON string to JSON object
            let contents;
            if (data) {
                contents = JSON.parse(data);
            } else {
                contents = {}
            }
            contents[sentDetails.uuid] = comment.author.id


            fs.writeFile(`public/data/${storySlug}-authors.json`, JSON.stringify(contents, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}

function handleNewWallet(comment, sentDetails) {
    fs.readFile(`public/data/wallets.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            let contents;
            if (data) {
                contents = JSON.parse(data);
            } else {
                contents = {}
            }
            contents[sentDetails.wallet] = comment.author.id;


            fs.writeFile(`public/data/wallets.json`, JSON.stringify(contents, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }

    });
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
    console.log('now!')
    try {
        let body = req.body.comment.body
        let b1 = body.split('<div>')[1]
        let b2 = b1.split('</div>')[0]
        let b3 = b2.split('<br>')[0]
        let sentJson = JSON.parse(b3)
        console.log(sentJson)
        if (sentJson.event_name === 'HIGHLIGHT_COMMENT') {
            console.log('got highlighted comment')
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
        console.log('This comment is a normal comment')
        addToFile(storySlug, JSON.stringify(req.body))
        res.json({ received: true });
    }

});

app.post('/create-story', (req, res) => {

    let storyUrl = req.body.data.storyURL
    let storySlug = getSlugFromUrl(storyUrl);
    fs.appendFile(`public/data/${storySlug}-comments.json`, '[]', (err) => {
        if (err) console.log(err)
    });
    fs.appendFile(`public/data/${storySlug}-authors.json`, '{}', (err) => {
        if (err) console.log(err)
    });
    fs.appendFile(`public/data/${storySlug}-chosen.json`, '{}', (err) => {
        if (err) console.log(err)
        res.send('Created story');
    });
})




app.use(express.static('public'))

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);