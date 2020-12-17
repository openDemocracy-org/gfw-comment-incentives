// Global variables

const gfwCommentsActive = true;
let gfwPanelVisible = false;
let gfwStlyesInserted = false;
let menuRoot = document.getElementById('gfw-menu-container')
let contentRoot = document.getElementById('gfw-widget'); // DOM node to hold widget
let wallet, pollCheckInterval;
let gfwMenuButton;
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
    #gfw-widget {
      clear: both;
    }
    #gfw-comments {
        overflow-x: hidden;
        overflow-y: auto; 
        padding-bottom: 5rem;
        margin-bottom: 2rem;
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
    #gfw-menu-container {
      float: right;
    }
    #gfw-menu-contents {
      position: absolute;
    }
    `
}

function insertStyles() {
  let node = document.createElement("style")
  let styleEl = document.querySelector('head').appendChild(node)
  styleEl.innerHTML = styles()
  gfwStlyesInserted = true;
}

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

// Add wallet flow

const startingContents = {
  para: `Hello :)<br/>
  If you setup a wallet, we can pay you whenever one of your comments is highlighted by an article author.<br/>
  To setup your wallet, please follow the <a href=''>instructions here</a>
  Please enter your wallet address below:<br/>
  <input type="text" name="wallet" /><br/>   
  `,
  buttons: [{
    label: "Submit wallet",
    id: "submit-wallet",
    go: function () {
      let input = document.querySelector('input[name=wallet]')
      wallet = input.value

      pollCheckInterval = setInterval(() => pollForSavedContent('/data/wallets.json', wallet, 'objKeyExist', () => {
        transitionWidget(commenterFlowHandleWalletSuccess);
      }, handleLookupError), 1000);
      commenterFlowSubmitWallet()
    }
  }]

}

let currentContents = startingContents; // Global content state

const handleLookupError = () => {
  alert('Lookup failed') // TODO
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
  buttons: [closeButton]
}

const menuTemplate = () => {
  return ` 
    <button id="gfw-menu" aria-haspopup="true" aria-expanded="false">GfW Options
        <span aria-hidden="true">&#x25be</span>
    </button>
    <div id="gfw-menu-contents" role="menu" hidden="hidden">
        <button role="menuitem" id="btn-claim-article" tabindex="-1">Claim article authorship</button>
    </div> 
`
}

const template = (content) => {
  return `
<section id="gfw-comments" class="mailing-list mailing-list--wide mailing-list--primary ${content.class ? content.class : ''}">
    <h1 class="sidebar__heading">Comment Incentives</h1>
    <p class="rich-text">${content.para}</p>
    ${content.buttons.map((button) => `<button class="sidebar__link" id="${button.id}">${button.label}</button>`)}
    </section>
    `
}

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

function insertContent() { // Runs once at the beginning
  !gfwStlyesInserted && insertStyles()
  gfwPanelVisible = true;
  menuRoot.innerHTML = menuTemplate()
  gfwMenuButton = document.querySelector('button#gfw-menu');

  function setMenuListeners() {
    gfwMenuButton.addEventListener('click', toggleMenu)
    gfwMenuButton.addEventListener('keydown', function (evt) {
      if (evt.keyCode === 40) {
        toggleMenu()
      }
    })

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
          <a href="mailto:matthewlinares@opendemocracy.net?subject=Author CommentID for ${slug}&body=ID:${data}%0D%0APlease add my ID to Wagtail!">Send CoralID to Matt @ openDemocracy</a><br/>
          Your coral ID: ${data}
  
          `,
          buttons: [closeButton]
        }
        updateGfwState({
          coralUserId: data
        })
        transitionWidget(newContents)
      }, handleLookupError), 1000);
    })
  }




  setMenuListeners()
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

  let currentState = updateGfwState(state)
  currentContents = startingContents


  // Check for approved author
  let meta = document.querySelector('[name="author_comment_id"]')
  if (meta) {
    let authorCommentId = meta.getAttribute('content')
    if (authorCommentId) {
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
      document.querySelector('#gfw-menu').removeAttribute('hidden')
    }
  }
}



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

function getSlugFromUrl(urlString) {
  let urlParts = urlString.split('/')
  let slug = urlParts[urlParts.length - 2]
  return slug
}

// Get highlighted comment
async function getHighlightedComment() {
  let meta = document.querySelector('[name="author_comment_id"]')
  if (meta) {
    let authorCommentId = meta.getAttribute('content')

    if (authorCommentId) {
      try {
        let response = await fetch(`{{externalServiceRootUrl}}/data/${slug}-chosen.json`);

        if (response.ok) { // if HTTP-status is 200-299
          // get the response body (the method explained below)
          let data = await response.json();
      
          if (data.author_id === authorCommentId) {
            document.querySelector('.highlighted-comment').removeAttribute('hidden')
            let highlightedCommentBox = document.querySelector('.highlighted-comment-content')
            highlightedCommentBox.innerHTML = data.chosen_comment.comment.body
          }
        }
      }
      catch (error) {
        console.error(error)
      }
    }
  }
}

function handleCoralReady() {
  coralReadyActions.forEach((action) => action())
}

getHighlightedComment()
checkForLoggedInUser()

