'use strict';

const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');
const SIGNING_SECRET = "empsec_fa0e94fca0c13666c96f01c09b3c3b4673e1bd37289d848411519f3c5f46eb81f610d0";
const crypto = require("crypto");
// Constants
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
// App
const app = express();


app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.raw({ type: "application/json" }))


// START Templating code just for POC
const slashes = require("connect-slashes");

const nunjucks = require('nunjucks');
nunjucks.configure('views', {
    autoescape: true,
    express: app
});

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
    const pageFullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    let pageSlugHash = createHash(req.originalUrl);
    pageSlugHash = pageSlugHash < 0 ? pageSlugHash * -1 : pageSlugHash;
    res.render('coral.html', {
        tabTitle: `${req.originalUrl} - od`,
        pageSlugHash: pageSlugHash,
        pageTitle: `An oD article with page slug ${req.originalUrl}`,
        pageFullUrl: pageFullUrl,
        pageRootUrl: 'https://comment-incentives.staging-caprover.opendemocracy.net',
        coralRootUrl: 'https://coral-talk-talk.staging-caprover.opendemocracy.net'
    });
});





function addToFile(fileName, message) {
    fs.readFile(`public/data/${fileName}.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);
            // add a new record
            contents.push(JSON.parse(message));
            // write new data back to the file
            fs.writeFile(`public/data/${fileName}.json`, JSON.stringify(contents, null, 4), (err) => {
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
    fs.readFile(`public/data/${storySlug}.json`, 'utf-8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
        } else {
            // parse JSON string to JSON object
            const contents = JSON.parse(data);

            const chosenComment = contents.filter(comment => comment.comment.body.includes(sentDetails.commenter_comment))
            highlightedCommentCandidate.chosen_comment = chosenComment

            fs.writeFile(`public/data/${storySlug}-chosen.json`, JSON.stringify(highlightedCommentCandidate, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
    });
}

function handleCommenterWallet(comment, sentDetails) {
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
            contents[sentDetails.commenter_wallet] = comment.author.id;


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

app.post("/highlight-comment", (req, res) => {
    let storyUrl = getStoryUrlFromComment(req.body)
    let storySlug = getSlugFromUrl(storyUrl)
    try {
        let body = req.body.comment.body
        let b1 = body.split('<div>')[1]
        let b2 = b1.split('</div>')[0]
        let b3 = b2.split('<br>')[0]
        let sentJson = JSON.parse(b3)
        if (sentJson.commenter_comment) {
            handleHighlightedComment(req.body, sentJson)
        }
        if (sentJson.commenter_wallet) {
            handleCommenterWallet(req.body, sentJson)
        }
        res.json({ status: 'REJECTED' });
    } catch (e) {
        console.log('This comment is a normal comment')
        addToFile(storySlug, JSON.stringify(req.body))
        res.json({ received: true });
    }
    
});

app.post('/create-story', (req, res) => {

    let storyUrl = req.body.data.storyURL
    let storySlug = getSlugFromUrl(storyUrl);
    fs.appendFile(`public/data/${storySlug}.json`, '[]', (err) => {
        if (err) console.log(err)
    });
    fs.appendFile(`public/data/${storySlug}-chosen.json`, '', (err) => {
        if (err) console.log(err)
        res.send('Created story');
    });
})




app.use(express.static('public'))

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);