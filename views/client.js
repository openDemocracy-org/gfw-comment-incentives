// Global variables

const gfwCommentsActive = true;
let gfwPanelVisible = false;
let gfwStlyesInserted = false;
let contentRoot; // DOM node to hold widget
let wallet, pollCheckInterval;
const body = document.querySelector('body')
const coralReadyActions = []

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const sessionUUID = uuidv4()
const slug = getSlugFromUrl(window.location.pathname)

// Styles for page injection

const styles = () => {
  return `
    #gfw-comments {
        overflow-x: hidden;
        overflow-y: auto;
        position: fixed;
        width: 30vw;
        height: 30vw;
        bottom: 2rem;
        right: 2rem;
        box-shadow: 0px 0px 4px rgba(0,0,0,.4);
        padding-bottom: 5rem;
    }
    #gfw-comments h1 {
        font-size: 1.4rem;
        margin-bottom: 0;
    }
    #gfw-comments h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: #98D7FF;
    }
    #reset-button {
      position: absolute;
      top: 1rem;
      right: 0.5rem;
    }

    #gfw-comments input {
      width: 100%;
    }

    #gfw-comments button {
      margin-top: 0;
      cursor: pointer;
      display: inline-block;
      margin-right: 0.5rem;
      text-decoration: underline;
      letter-spacing: 1px;
      font-size: .93333rem;
      text-transform: uppercase;
      font-weight: 700;
      text-underline-position: under;
    }
    #gfw-comments .rich-text a {
      color: white;
      text-underline-position: auto;
    }

    #gfw-comments p {
      margin-bottom: 1rem;
    }
    #gfw-comments button:hover,
    #gfw-comments .rich-text a:hover,
    #gfw-comments a:hover {
      color: #000;
      background: inherit;
      border: inherit;
    }
    `
}

function insertStyles() {
  let node = document.createElement("style")
  let styleEl = document.querySelector('head').appendChild(node)
  styleEl.innerHTML = styles()
  gfwStlyesInserted = true;
}



// Initial widget content

const startingContents = {
  para: "Ready to try something?",
  buttons: [
    {
      label: "I'm an author",
      id: "button1",
      go: function () {
        updateGfwState({
          userType: 'author'
        })
        transitionWidget(beginAuthorFlow)
      }
    }, {
      label: "I'm a commenter",
      id: "button2",
      go: function () {
        updateGfwState({
          userType: 'commenter'
        })
        transitionWidget(beginCommenterFlow)
      }
    }
  ]
}

let currentContents = startingContents; // Global content state

// Generic components and actions

const resetButton = {
  label: "Reset",
  id: "reset-button",
  go: function () {
    updateGfwState({
      userType: undefined
    })
    pollCheckInterval && clearInterval(pollCheckInterval)
    transitionWidget(startingContents)
  }
}

const closeButton = {
  label: "Close",
  id: "close-button",
  go: function () {
    closeWidget()
  }
}

function closeWidget() {
  contentRoot.innerHTML = ''
  currentContents = startingContents
}

// Commenter flow

const beginCommenterFlow = {
  para: `Hello :)<br/>
  If you setup a wallet, we can pay you whenever one of your comments is highlighted by an article author.<br/>
  To setup your wallet, please follow the <a href=''>instructions here</a>
  `,
  buttons: [{
    label: "I've done that",
    id: "done-that",
    go: function () {
      transitionWidget(commenterFlowGetWallet)
    }
  }, resetButton]
}

const handleLookupError = () => {
  alert('Lookup failed') // TODO
}

const commenterFlowGetWallet = {
  para: `Great :)<br/>
    Please enter your wallet address below:<br/>
    <input type="text" name="wallet" /><br/>   
    `,
  buttons: [{
    label: "Submit wallet",
    id: "submit-wallet",
    go: function () {
      let input = document.querySelector('input[name=wallet]')
      wallet = input.value
      const lookup = {
        key: wallet
      }
      pollCheckInterval = setInterval(() => pollForSavedContent('/data/wallets.json', lookup, 'objKeyExist', () => {
        transitionWidget(commenterFlowHandleWalletSuccess);
      }, handleLookupError), 1000);
      commenterFlowSubmitWallet()
    }
  }, resetButton]
}

const commenterFlowSubmitWallet = () => {
  let newContents = {
    para: `Excellent :)<br/>
      In the box at the bottom is some code. We need you to submit it as a comment (Matt - this will be done via JS in future). Please paste it into the comment box and submit.<br/>
      <span class="loading">Waiting for you to submit... page will update shortly thereafter...</span>
      `,
    buttons: [resetButton]
  }
  let message = {
    contents: { "event_name": "NEW_WALLET", "wallet": `${wallet}`, }
  }
  postMessage(message)
  transitionWidget(newContents)
}

async function pollForSavedContent(path, desiredData, dataFormat, success, error) {
  try {
    let response = await fetch(`{{externalServiceRootUrl}}${path}`);

    if (response.ok) { // if HTTP-status is 200-299
      // get the response body (the method explained below)
      let data = await response.json();

      if (dataFormat === 'objEq') {
        if (data[desiredData.key] === desiredData.value) {
          clearInterval(pollCheckInterval)
          success()
        }
      }
      if (dataFormat === 'objKeyExist') {
        if (data[desiredData]) {
          clearInterval(pollCheckInterval)
          success(data[desiredData])
        }
      }

    }
  } catch (e) {
    clearInterval(pollCheckInterval)
    error()
  }
}

const commenterFlowHandleWalletSuccess = {
  para: `Wowzers!<br/>
    We have received your wallet!<br/>
    You can go ahead and close this window now. If an author chooses to highlight your comment, we will use the wallet you submitted to share some of the page's revenue with you. How's that?!
    `,
  buttons: [closeButton, resetButton]
}



// Author flow

const beginAuthorFlow = {
  para: `Hello :)<br/>`,
  buttons: [{
    id: "message-coral",
    label: "Send wallet/username to oD",
    go: function () {
      alert('To do!')
    }
  }, resetButton]
}






const template = (content) => {
  return `
<section id="gfw-comments" class="sidebar sidebar--banner sidebar--banner-blue ${content.class ? content.class : ''}">
    <h1 class="sidebar__heading">Comment Incentives</h1>
    <h2>$ £ ¥ ₹ ₽ 元 ₪ ₯ ₺ </h2>
    <p class="rich-text">${content.para}</p>
    ${content.buttons.map((button) => `<button class="sidebar__link" id="${button.id}">${button.label}</button>`)}
    </section>
    `
}

function insertContent() {
  !gfwStlyesInserted && insertStyles()
  if (!contentRoot) {
    let node = document.createElement('div')
    node.setAttribute('id', 'gfw-root')
    contentRoot = body.appendChild(node)
  }
  gfwPanelVisible = true;
  contentRoot.innerHTML = template(currentContents)
  updateEventHandlers()
}

function transitionWidget(someContents) {
  let clonedContents = Object.assign({}, currentContents);
  let newContents = {
    ...clonedContents,
    ...someContents
  }
  currentContents = newContents
  contentRoot.innerHTML = template(currentContents)
  updateEventHandlers()
}

function updateEventHandlers() {
  currentContents.buttons.forEach(buttonMeta => {
    let button = document.querySelector(`#${buttonMeta.id}`)
    button.addEventListener('click', buttonMeta.go)
  })
}

// State handlers

function updateGfwState(updates) {
  let gotOldState = localStorage.getItem('gfwState');
  let newState = updates;
  if (gotOldState) {
    let oldState = JSON.parse(gotOldState);
    newState = {
      ...oldState,
      ...updates
    }
  }
  localStorage.setItem('gfwState', JSON.stringify(newState))
  return newState;
}

function gfwGotSignedInUser(state) {

  let definiteState = {
    loggedIn: true
  }

  let currentState = updateGfwState(definiteState)
  if (currentState.userType === 'author') {
    currentContents = beginAuthorFlow
  } else if (currentState.userType === 'commenter') {
    currentContents = beginCommenterFlow
  } else {
    currentContents = startingContents
  }

  // Check for approved author
  let meta = document.querySelector('[name="author_comment_id"]')
  if (meta) {
    let authorCommentId = meta.getAttribute('content')
    if (state.coralUserId) {
      if (state.coralUserId === authorCommentId) {
        coralReadyActions.push(function () {
          let message = {
            contents: { "event_name": "INIT_HIGHLIGHT_COMMENTS" }
          }
          postMessage(message)
        })
      }
    }
  }


  insertContent();
}

function gfwGotSignedOutUser() {
  const state = {
    loggedIn: false
  }
  updateGfwState(state)
  closeWidget()
}

function checkForLoggedInUser() {

  let gotState = localStorage.getItem('gfwState');
  if (gotState) {
    let state = JSON.parse(gotState)
    if (state.loggedIn) {
      gfwGotSignedInUser(state)
    }
  }
}

checkForLoggedInUser()

function getCoralWindow() {
  try {
    var iframe = document.querySelector('#coral_thread_iframe');
    var coralWindow = iframe.contentWindow;
    return coralWindow
  }
  catch (error) {
    console.error(error)
    alert("Error: couldn't connect to Coral.")
    return false;
  }
}

function postMessage(comment) {
  let coralWindow = getCoralWindow()
  if (coralWindow) {
    coralWindow.postMessage(comment, "{{coralRootUrl}}")
  }
}


/* Generic codes */

let gfwMenuButton = document.querySelector('#gfw-menu')
gfwMenuButton.addEventListener('click', toggleMenu)
gfwMenuButton.addEventListener('keydown', function (evt) {
  if (evt.keyCode === 40) {
    toggleMenu()
  }
})
function toggleMenu() {
  let expanded = gfwMenuButton.getAttribute('aria-expanded')
  let menu = document.querySelector('#gfw-menu + [role="menu"]')
  if (expanded === 'false') {
    gfwMenuButton.setAttribute('aria-expanded', 'true')
    menu.hidden = false;
    menu.querySelector(':not([disabled])').focus()
  } else {
    gfwMenuButton.setAttribute('aria-expanded', 'false')
    menu.hidden = true;
  }
}

function getSlugFromUrl(urlString) {
  let urlParts = urlString.split('/')
  let slug = urlParts[urlParts.length - 2]
  return slug
}

// Claim article authorship

let btnClaimArticle = document.querySelector('#btn-claim-article')
btnClaimArticle.addEventListener('click', function () {

  let message = {
    contents: { "event_name": "AUTHOR_CANDIDATE", "uuid": sessionUUID }
  }
  postMessage(message)

  pollCheckInterval = setInterval(() => pollForSavedContent(`/data/${slug}-authors.json`, sessionUUID, 'objKeyExist', (data) => {

    let newContents = {
      para: `Excellent :)<br/>
        Your CoralTalk ID has been stored on the server. Please click the button below to email it to Matt:<br/>
        <a href="mailto:matthewlinares@opendemocracy.net?subject=Author CommentID for ${slug}&body=ID:${data}%0D%0APlease add my ID to Wagtail!">Send CoralID to Matt @ openDemocracy</a>
        `,
      buttons: [resetButton]
    }
    updateGfwState({
      coralUserId: data
    })
    transitionWidget(newContents)

  }, handleLookupError), 1000);

})

function handleCoralReady() {
  coralReadyActions.forEach((action) => action())
}


// Get highlighted comment

async function getHighlightedComment() {
  let meta = document.querySelector('[name="author_comment_id"]')
  if (meta) {
    let authorCommentId = meta.getAttribute('content')

    let response = await fetch(`{{externalServiceRootUrl}}/data/${slug}-chosen.json`);

    if (response.ok) { // if HTTP-status is 200-299
      // get the response body (the method explained below)
      let data = await response.json();

      if (data.author_id === authorCommentId) {
        console.log('got valid highlighted comment!')
        let highlightedCommentBox = document.querySelector('#highlighted-comment')
        highlightedCommentBox.innerHTML = data.chosen_comment[0].comment.body
      }
    }
  }
}

getHighlightedComment()