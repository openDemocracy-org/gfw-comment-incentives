'use strict';

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

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

function addToFile(message) {
    fs.appendFile('public/events.txt',message, (err) => {
        if (err) throw err;
    });
}

function extractBody(body, sig) {
    addToFile('extracting body')
    // Step 1: Extract signatures from the header.
    const signatures = sig
        // Split the header by `,` to get a list of elements.
        .split(",")
        // Split each element by `=` to get a prefix and value pair.
        .map(element => element.split("="))
        // Grab all the elements with the prefix of `sha256`.
        .filter(([prefix]) => prefix === "sha256")
        // Grab the value from the prefix and value pair.
        .map(([, value]) => value);
    addToFile(JSON.stringify(signatures))
    // Step 2: Prepare the `signed_payload`.
    const signed_payload = body;

    // Step 3: Calculate the expected signature.
    const expected = crypto
        .createHmac("sha256", SIGNING_SECRET)
        .update(signed_payload)
        .digest()
        .toString("hex");

    // Step 4: Compare signatures.
    if (
        // For each of the signatures on the request...
        !signatures.some(signature =>
            // Compare the expected signature to the signature on in the header. If at
            // least one of the match, we should continue to process the event.
            crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
        )
    ) {
        addToFile('invalid signature')
        throw new Error("Invalid signature");
    }
    addToFile('successful signature')
    // Parse the JSON for the event.
    return JSON.parse(body.toString());
}

app.post("/highlight-comment", bodyParser.raw({ type: "application/json" }), (req, res) => {


    addToFile('webhook triggered!')

    const sig = req.headers["x-coral-signature"];

    let body;

    try {
        // Parse the JSON for the event.
        body = extractBody(req.body, sig);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    fs.appendFile('public/events.txt', JSON.stringify(body), (err) => {
        if (err) throw err;
    });

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
});

app.get('/highlight-comment', (req, res) => {

    fs.appendFile('public/events.txt', JSON.stringify(req.body), (err) => {
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