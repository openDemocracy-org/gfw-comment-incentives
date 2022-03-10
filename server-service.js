'use strict'
require('dotenv').config()
const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const nodemailer = require('nodemailer')
const axios = require('axios')

// START Templating code just for reports
const slashes = require('connect-slashes')

const MongoClient = require('mongodb').MongoClient

// Constants
const SERVICE_PORT = process.env.SERVICE_PORT || 4000
const SERVICE_HOST = process.env.SERVICE_HOST || '0.0.0.0'
const MONGO_URL = process.env.MONGO

// App
const app = express()

const nunjucks = require('nunjucks')
nunjucks.configure(['assets', 'views'], {
  autoescape: false,
  express: app,
})

app.use(helmet())
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.raw({ type: 'application/json' }))
app.use(express.static('public'))

/**
 * Format API error response for printing in console.
 */

function formatError(error) {
  if (error.response) {
    const responseStatus = `${error.response.status} (${error.response.statusText})`

    console.log(
      `Request failed with HTTP status code ${responseStatus}`,
      JSON.stringify(
        {
          url: error.config.url,
          response: error.response.data,
        },
        null,
        2
      )
    )
  } else {
    console.log(error)
  }

  throw error
}

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  port: 465, // true for 465, false for other ports
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.OD_FROM_GMAIL,
    pass: process.env.OD_FROM_GMAIL_PASSWORD,
  },
  secure: true,
})

const mongoClient = new MongoClient(MONGO_URL, { useUnifiedTopology: true })

// Initialize connection once
mongoClient.connect(function (err) {
  if (err) throw err
  // Start the application after the database connection is ready
  app.listen(SERVICE_PORT, SERVICE_HOST)
})

app.get('/reporting/', slashes(), function (req, res) {
  res.render('reporting.html')
})

app.get('/assets/reporting.js', async function (req, res) {
  res.set('content-type', 'text/javascript')
  res.render('comment-x-reporting.js')
})

app.get('/assets/client.js', function (req, res) {
  res.set('content-type', 'text/javascript')
  res.render('comment-x-client.js', {
    pageRootUrl: process.env.PAGE_ROOT_URL,
    coralRootUrl: process.env.CORAL_ROOT_URL,
    externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
    parliaUrl: process.env.PARLIA_EMBED_URL,
  })
})

function getSlugFromUrl(req, path) {
  return req.originalUrl.split(path)[1].split('.json')[0]
}

app.get('/assets/iframe.js', function (req, res) {
  res.set('content-type', 'text/javascript')
  res.render('comment-x-iframe.js', {
    externalServiceRootUrl: process.env.SERVICE_ROOT_URL,
  })
})

app.get('/data/all-wallets.json', async function (req, res) {
  const docs = await getAllDocs('wallets')
  res.json(docs)
})

app.get('/data/wallets/*', async function (req, res) {
  const serviceDb = mongoClient.db('gfw-service')
  let authorCoralId = null
  let commenterCoralId = null

  try {
    const slug = req.originalUrl.split('/data/wallets/')[1].split('.json')[0]
    authorCoralId = req.query.author
    const cursor = await serviceDb.collection(`${slug}-chosen`).find({ author_id: authorCoralId })

    let docsHighlightedByAuthor = []
    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      docsHighlightedByAuthor.push(doc)
    }
    if (docsHighlightedByAuthor.length > 0) {
      // Got at least one highlighted comment, let's get commenter ID

      let firstHighlightedComment = docsHighlightedByAuthor[0]

      let commentId = firstHighlightedComment.comment_id.split('comment-')[1]

      commenterCoralId = await getCommentAuthorIdFromCommentId(commentId)
    }
    let response = await getWallets(authorCoralId, commenterCoralId)
    res.send(response)
  } catch (e) {
    console.log(e)
    res.send(e)
  }
})

async function getCommentAuthorIdFromCommentId(commentId) {
  const coralDb = mongoClient.db('coral')
  const coralCursor = await coralDb.collection('comments').find({ id: commentId })
  let coralDocs = []
  while (await coralCursor.hasNext()) {
    const doc = await coralCursor.next()
    coralDocs.push(doc)
  }
  if (coralDocs.length > 0) {
    let highlightedComment = coralDocs[0]
    return highlightedComment.authorID
  } else {
    return null
  }
}

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

async function toArray(iterator) {
  return new Promise((resolve, reject) => {
    iterator.toArray((err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

function walletRecordForCommentId(coralId, cards) {
  const resp = {
    coralUser: coralId,
  }
  const card = cards.filter((c) => c.label === `comment-x-${coralId}`)
  if (card.length > 0) {
    resp.card = {
      balance: card[0].normalized[0].balance,
      currency: card[0].normalized[0].currency,
      id: card[0].id,
      label: card[0].label,
    }
  }

  return resp
}

async function getNamesFromIds(records) {
  const listWithNames = await Promise.all(
    records.map(async (record) => {
      const user = await getUser(record.coralUser)
      record.username = user.username
      return record
    })
  )
  return listWithNames
}

async function getUserSubmittedWallets(records, db) {
  const recordsWithUserWallets = await Promise.all(
    records.map(async (record) => {
      const doc = await getFirstDocById(db, 'wallets', record.coralUser)
      if (doc && doc.isUserSubmitted) {
        record.gotUserSubmittedWallet = true
      }
      return record
    })
  )
  return recordsWithUserWallets
}

app.get('/data/all-comment-x.json', async function (req, res) {
  let cards = await listUpholdCards()

  const serviceDb = mongoClient.db('gfw-service')
  const allCollections = await toArray(serviceDb.listCollections())
  const collectionsWithAuthors = allCollections.filter((collection) =>
    collection.name.includes('-authors')
  )
  const collectionsWithChosen = allCollections.filter((collection) =>
    collection.name.includes('-chosen')
  )
  const activeCollections = collectionsWithAuthors.map((collection) => {
    const slug = collection.name.split('-authors')[0]
    return {
      slug: slug,
      commenters: collectionsWithChosen.filter((c) => c.name.split('-chosen')[0] === slug),
    }
  })
  const activeCollectionsWithAuthorsAndCommenters = await Promise.all(
    activeCollections.map(async (collection) => {
      // Get authors
      const docs = await getAllDocs(`${collection.slug}-authors`)
      const authorCoralIds = docs.map((doc) => Object.values(doc)[1])
      const uniqueAuthorCoralIds = authorCoralIds.filter((cid, i, self) => self.indexOf(cid) === i)
      const authorWalletRecords = uniqueAuthorCoralIds.map((cid) =>
        walletRecordForCommentId(cid, cards)
      )
      const authorRecordsWithUsernames = await getNamesFromIds(authorWalletRecords)

      const withWalletsToo = await getUserSubmittedWallets(authorRecordsWithUsernames, serviceDb)

      collection.authors = withWalletsToo

      if (collection.commenters.length > 0) {
        // Get commenters
        const cDocs = await getAllDocs(`${collection.slug}-chosen`)
        const commenterWalletRecords = await Promise.all(
          cDocs.map(async (comment) => {
            const commentId = await getCommentAuthorIdFromCommentId(
              comment.comment_id.split('comment-')[1]
            )
            const record = walletRecordForCommentId(commentId, cards)
            record.comment = comment.commenter_comment
            record.highlighted_by = comment.author_id
            return record
          })
        )
        const commenterRecordsWithUsernames = await getNamesFromIds(commenterWalletRecords)
        const withWalletsToo = await getUserSubmittedWallets(
          commenterRecordsWithUsernames,
          serviceDb
        )
        collection.commenters = withWalletsToo
      }

      //const collectionWithNames = collection.map()

      return collection
    })
  )

  res.json(activeCollectionsWithAuthorsAndCommenters)
})

async function getUser(userId) {
  const coralDb = mongoClient.db('coral')
  const coralCursor = await coralDb.collection('users').find({ id: userId })
  let coralDocs = []
  while (await coralCursor.hasNext()) {
    const doc = await coralCursor.next()
    coralDocs.push(doc)
  }
  if (coralDocs.length > 0) {
    return coralDocs[0]
  }
  return null
}

async function getWallets(authorId, commenterId) {
  const serviceDb = mongoClient.db('gfw-service')
  let commenterWalletDoc = null
  let authorWalletDoc = await getFirstDocById(serviceDb, 'wallets', authorId)
  if (commenterId) commenterWalletDoc = await getFirstDocById(serviceDb, 'wallets', commenterId)
  let gotWallet = authorWalletDoc ? true : commenterWalletDoc ? true : false
  let response = {
    gotWallet,
  }
  if (authorWalletDoc) response.authorWallet = authorWalletDoc.wallet
  if (commenterWalletDoc) {
    response.commenterWallet = commenterWalletDoc.wallet
    response.commenterWalletUserSubmitted = commenterWalletDoc.isUserSubmitted
  }
  return response
}

async function handleHighlightedComment(comment, sentDetails) {
  const highlightedComment = {
    author_id: comment.author.id,
    ...sentDetails,
  }
  let storyUrl = getStoryUrlFromComment(comment)
  let storySlug = getSlugFromUrl(storyUrl)

  let fileName = `${storySlug}-chosen`
  const replace = {
    author_id: comment.author.id,
  }
  addToDbReplaceAll(fileName, highlightedComment, replace)
  let commentId = sentDetails.comment_id.split('comment-')[1]
  let commenterId = await getCommentAuthorIdFromCommentId(commentId)
  ensureWalletForUser(commenterId, sentDetails, 'commenter')
}

async function ensureWalletForUser(userId, sentJson, userType) {
  try {
    let requestUserCreateWallet = false
    let wallets = await getWallets(userId)
    if (!wallets.gotWallet) {
      requestUserCreateWallet = true
      // Create uphold wallet
      let card = await createUpholdCard(userId)
      let pointer = await createUpholdPointer(card.id)
      let wallet = pointer.id.split('$')[1].split('.').join('-') // Remove dollar and replace '.' with '-' to appease MongoDB
      handleNewWallet(userId, wallet, false)
    }
    let user = await getUser(userId)
    if (user) {
      let articleUrl = getArticleUrlFromSentJson(sentJson)
      if (userType === 'commenter') {
        sendHighlightedCommentNotification(user.email, requestUserCreateWallet, articleUrl)
      } else {
        sendAuthorTemporaryWalletNotification(user.email, requestUserCreateWallet, articleUrl)
      }
    }
  } catch (error) {
    formatError(error)
  }
}

function sendAuthorTemporaryWalletNotification(userEmail, requestUserCreateWallet, articleUrl) {
  const email = {
    to: userEmail,
    subject: 'Authorship claim received',
    salutation: 'Hello,',
    paragraphs: [
      `Your claim to have authored <a href="${articleUrl}">an article on openDemocracy</a> has been received and will be validated shortly by one of our editors.</a>.`,
      `Thank you so much for joining our experiment :)`,
    ],
    signoff1: 'All the best,',
    signoff2: 'openDemocracy',
  }
  if (requestUserCreateWallet) {
    email.paragraphs.push(
      `We have created a holding wallet for you, and this wallet is currently being paid 50% of the page's revenue.`
    )
    email.paragraphs.push(
      `To add your own wallet, please <a href="${articleUrl}">visit the page</a> and follow the instructions in the Comment widget.`
    )
  } else {
    email.paragraphs.push(
      `The wallet you submitted is currently being paid 50% of the page's revenue.`
    )
  }
  sendEmail(email)
}

function sendHighlightedCommentNotification(userEmail, requestUserCreateWallet, articleUrl) {
  const email = {
    to: userEmail,
    subject: 'openDemocracy highlighted your comment',
    salutation: 'Dear reader,',
    paragraphs: [
      `Congratulations, your comment on <a href="${articleUrl}#highlighted-comment">an openDemocracy article was highlighted</a>.`,
      `You are now eligible to receive a <a href="https://opendemocracy.net/commentx">share of micropayments through our CommentX program</a>.`,
      `Comments are being rewarded in this way, with real money, in an experiment to encourage debate. Please reply to this email with any queries.`,
    ],
    signoff1: 'All the best,',
    signoff2: 'openDemocracy',
  }
  if (requestUserCreateWallet) {
    email.paragraphs.push(
      `We have created a temporary wallet for you, and this wallet is currently being paid 10% of the page's revenue.`
    )
    email.paragraphs.push(
      `To add your own wallet, please <a href="${articleUrl}">visit the page</a> and follow the instructions in the Comment widget.`
    )
  } else {
    email.paragraphs.push(
      `The wallet you submitted is currently being paid 10% of the page's revenue.`
    )
  }
  sendEmail(email)
}

async function listUpholdCards() {
  try {
    const response = await axios.request({
      method: 'GET',
      url: `${process.env.UPHOLD_API_ENDPOINT}/v0/me/cards/`,
      headers: {
        Authorization: `Bearer ${process.env.UPHOLD_ACCESS_TOKEN}`,
        'content-type': 'application/json',
      },
    })

    return response.data
  } catch (error) {
    formatError(error)
  }
}

async function createUpholdCard(commenterId = null) {
  try {
    const response = await axios.request({
      method: 'POST',
      url: `${process.env.UPHOLD_API_ENDPOINT}/v0/me/cards/`,
      data: {
        label: `comment-x-${commenterId}`,
        currency: 'GBP',
      },
      headers: {
        Authorization: `Bearer ${process.env.UPHOLD_ACCESS_TOKEN}`,
        'content-type': 'application/json',
      },
    })

    return response.data
  } catch (error) {
    formatError(error)
  }
}

async function createUpholdPointer(sourceCardID = null) {
  try {
    const response = await axios.request({
      method: 'POST',
      url: `${process.env.UPHOLD_API_ENDPOINT}/v0/me/cards/${sourceCardID}/addresses`,
      data: {
        network: 'interledger',
      },
      headers: {
        Authorization: `Bearer ${process.env.UPHOLD_ACCESS_TOKEN}`,
        'content-type': 'application/json',
      },
    })

    return response.data
  } catch (error) {
    formatError(error)
  }
}

function getArticleUrlFromSentJson(sentJson) {
  if (sentJson.pageUrl.beforeDot === 'local') {
    return `http://${sentJson.pageUrl.beforeDot}host:${sentJson.pageUrl.afterDot}`
  } else {
    return `https://${sentJson.pageUrl.beforeDot}.net${sentJson.pageUrl.afterDot}`
  }
}

async function handleAuthorCandidate(comment, sentDetails) {
  let storyUrl = getStoryUrlFromComment(comment)
  let storySlug = getSlugFromUrl(storyUrl)
  let toStore = {
    [sentDetails.uuid]: comment.author.id,
  }
  let fileName = `${storySlug}-authors`
  addToDb(fileName, toStore)
  const claimingAuthor = await getUser(comment.author.id)
  if (claimingAuthor) {
    ensureWalletForUser(comment.author.id, sentDetails, 'author')
    let claimingAuthorEmail = claimingAuthor.email
    let claimingAuthorUsername = claimingAuthor.username
    const subjectString = `New authorship claim: ${claimingAuthorUsername}`
    const articleUrl = getArticleUrlFromSentJson(sentDetails)
    const email = {
      subject: subjectString,
      salutation: 'Hey,',
      paragraphs: [
        `There has been an authorship claim:`,
        `${claimingAuthorEmail} has asserted their authorship of the following article: <a href="${articleUrl}">${articleUrl}</a>`,
        `If this is correct please add the following ID to their Wagtail profile, enabling them to highlight comments:`,
        `<b>${comment.author.id}</b>`,
        `Please let them know when you have done this. Thank you.`,
        `(If you are testing things, visiting <a href="${articleUrl}?caid=${comment.author.id}">this URL</a> logged in as the above user will enable you to highlight comments.)`,
      ],
      signoff1: 'Love,',
      signoff2: 'CommentX x x',
    }
    sendEmail(email)
  }
}

function sendEmail(email) {
  const messageString = email.paragraphs.join('\n')

  const mailData = {
    from: process.env.OD_FROM_GMAIL, // sender address
    to: email.to ? `${email.to}, ${process.env.OD_EDITOR_EMAIL}` : process.env.OD_EDITOR_EMAIL, // list of receivers
    subject: email.subject,
    text: `${email.salutation}\n${messageString}\n${email.signoff1}\n${email.signoff2}`,
    html: `<p>${email.salutation}</p>
            ${email.paragraphs.map((email) => `<p>${email}</p>`).join('')}
            <p> ${email.signoff1} </p><p>${email.signoff2}</p>`,
  }
  transporter.sendMail(mailData, function (err, info) {
    if (err) console.log(err)
    else console.log(info)
  })
}

function handleNewWallet(coralUserId, walletIdentifier, isUserSubmitted) {
  let toStore = {
    [walletIdentifier]: coralUserId,
    _id: coralUserId,
    wallet: walletIdentifier,
    isUserSubmitted,
  }
  let toReplace = {
    _id: coralUserId,
  }
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

app.post('/handle-comment', (req, res) => {
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
      res.json({ status: 'REJECTED' })
    } else if (sentJson.event_name === 'NEW_WALLET') {
      handleNewWallet(req.body.author.id, sentJson.wallet, true)
      res.json({ status: 'REJECTED' })
    } else if (sentJson.event_name === 'AUTHOR_CANDIDATE') {
      handleAuthorCandidate(req.body, sentJson)
      res.json({ status: 'REJECTED' })
    } else {
      // Not in list, must be OK
      res.json({ status: 'REJECTED' })
    }
  } catch (e) {
    // Any errors must be normal comments
    console.log(e)
    res.json({ received: true })
  }
})

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
  const cursor = db.collection(collection).find({})
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
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

console.log(`Running on http://${SERVICE_HOST}:${SERVICE_PORT}`)
