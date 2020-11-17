'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.post('/highlight-comment', (req,res) => {
    console.log(JSON.stringify(req.body))
    
    fs.appendFile('public/logs.txt', JSON.stringify(req.body), (err) => {
        if (err) throw err;
    });
})

app.get('/highlight-comment', (req,res) => {
    
    fs.appendFile('public/logs.txt', req.body, (err) => {
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