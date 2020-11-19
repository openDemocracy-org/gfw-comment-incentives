'use strict';

const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');
const SIGNING_SECRET = "empsec_fa0e94fca0c13666c96f01c09b3c3b4673e1bd37289d848411519f3c5f46eb81f610d0";
const crypto = require("crypto");
// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.raw({ type: "application/json" }))

function addToFile(fileName, message) {
    fs.readFile(`public/${fileName}.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);
            // add a new record
            contents.push(JSON.parse(message));
            // write new data back to the file
            fs.writeFile(`public/${fileName}.json`, JSON.stringify(contents, null, 4), (err) => {
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
    fs.readFile(`public/${storySlug}.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);

            const chosenComment = contents.filter(comment => comment.comment.body.includes(sentDetails.commenter_comment))
            highlightedCommentCandidate.chosen_comment = chosenComment

            fs.writeFile(`public/${storySlug}-chosen.json`, JSON.stringify(highlightedCommentCandidate, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}

function handleCommenterWallet(comment, sentDetails) {
    fs.readFile(`public/wallets.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);
            contents[sentDetails.commenter_wallet] = comment.author.id;


            fs.writeFile(`public/wallets.json`, JSON.stringify(contents, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}



function getStoryUrlFromRequest(reqBody) {
    return reqBody.data ? reqBody.data.storyURL : reqBody.storyURL
}

function getStoryUrlFromComment(reqBody) {
    return reqBody.story.url
}

function getSlugFromUrl(urlString) {
    let slug;
    if (urlString.includes('localhost')) {
        slug = urlString.split('=')[1]
    } else {
        let urlParts = urlString.split('/')
        slug = urlParts[urlParts.length - 1]
    }
    return slug
}

app.post("/highlight-comment", (req, res) => {
    let storyUrl = getStoryUrlFromComment(req.body)
    let storySlug = getSlugFromUrl(storyUrl)
    try {
        let body = req.body.comment.body
        let b1 = body.split('<div>')[1]
        let b2 = b1.split('</div>')[0]
        let sentJson = JSON.parse(b2)
        if (sentJson.commenter_comment) {
            handleHighlightedComment(req.body, sentJson)
        }
        if (sentJson.commenter_wallet) {
            handleCommenterWallet(req.body, sentJson)
        }
    } catch (e) {
        console.log('This comment is a normal comment')
        addToFile(storySlug, JSON.stringify(req.body))
    }
    res.json({ received: true });
});

app.post('/create-story', (req, res) => {
    let storyUrl = getStoryUrlFromRequest(req.body);
    console.log(storyUrl)
    let storySlug = getSlugFromUrl(storyUrl);
    console.log(storySlug)
    fs.appendFile(`public/${storySlug}.json`, '[]', (err) => {
        if (err) console.log(err)
    });
    fs.appendFile(`public/${storySlug}-chosen.json`, '', (err) => {
        if (err) console.log(err)
        res.send('Created story');
    });
})

app.get('/highlight-comment', (req, res) => {

    fs.appendFile('public/events.json', JSON.stringify(req.body), (err) => {
        if (err) throw err;
        res.send('Created logs');
    });
})

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use(express.static('public'))

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);