'use strict';
require('dotenv').config()
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');

// Constants
const SITE_PORT = process.env.SITE_PORT || 8080;
const SITE_HOST = process.env.SITE_HOST || '0.0.0.0';

// App
const app = express();
app.use(cors())
app.use(bodyParser.json())

const nunjucks = require('nunjucks');
nunjucks.configure('views', {
    autoescape: false,
    express: app
});


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

app.get('/*', slashes(), function (req, res) {

    let protocol = process.env.PROTOCOL || 'https://'
    let pageSlug = req.originalUrl
    let coralAuthorId = req.query.caid
    if (coralAuthorId) {
        // remove query params
        pageSlug = req.originalUrl.split('?')[0]
    }
    let pageSlugHash = createHash(pageSlug);

    const pageFullUrl = protocol + req.get('host') + pageSlug;

    pageSlugHash = pageSlugHash < 0 ? pageSlugHash * -1 : pageSlugHash;

    let opts = {
        tabTitle: `${pageSlug} - od`,
        pageSlugHash: pageSlugHash,
        pageTitle: `An oD article with page slug ${pageSlug}`,
        pageFullUrl: pageFullUrl.includes('https://localhost') ? process.env.PAGE_ROOT_URL + pageSlug : pageFullUrl,
        serviceRootUrl: process.env.SERVICE_ROOT_URL,
        coralRootUrl: process.env.CORAL_ROOT_URL,
        coralAuthorId: coralAuthorId ? coralAuthorId : ''
    }


    res.render('coral-test.html', opts);
});


app.get('/articles/*', slashes(), function (req, res) {

    let protocol = process.env.PROTOCOL || 'https://'
    let pageSlug = req.originalUrl
    let coralAuthorId = req.query.caid
    if (coralAuthorId) {
        // remove query params
        pageSlug = req.originalUrl.split('?')[0]
    }
    let pageSlugHash = createHash(pageSlug);

    const pageFullUrl = protocol + req.get('host') + pageSlug;

    pageSlugHash = pageSlugHash < 0 ? pageSlugHash * -1 : pageSlugHash;

    let opts = {
        tabTitle: `${pageSlug} - od`,
        pageSlugHash: pageSlugHash,
        pageTitle: `An oD article with page slug ${pageSlug}`,
        pageFullUrl: pageFullUrl.includes('https://localhost') ? process.env.PAGE_ROOT_URL + pageSlug : pageFullUrl,
        serviceRootUrl: process.env.SERVICE_ROOT_URL,
        coralRootUrl: process.env.CORAL_ROOT_URL,
        coralAuthorId: coralAuthorId ? coralAuthorId : ''
    }


    res.render('coral.html', opts);
});

app.listen(SITE_PORT, SITE_HOST);
console.log(`Running on http://${SITE_HOST}:${SITE_PORT}`);