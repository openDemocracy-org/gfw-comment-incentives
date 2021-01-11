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
      line-height: 1.47;
      padding: 0 2rem;
    }
    #gfw-comments button:hover,
    #gfw-comments .rich-text a:hover,
    #gfw-comments a:hover {

    }
    #gfw-menu {
      background: none;
      font-size: 2rem;
      cursor: pointer;
    }

    #btn-claim-article { 
    }

    #gfw-menu-container {      
      position: absolute;
      right: 2.66667rem;
      float: right;
      width: 50%;
      text-align: right;
      z-index:10;
    }
    #gfw-menu-contents {
      width: 100%;
    }
    #loading[hidden=hidden] {
      display: none;
    }
    #coral_thread_container {
      position: relative;
      min-height: 723px;
    }
    #loading {
      position: absolute;
      width: 100%;
      height: 3000px;
      left: 0;
      top: 0;
      right: 0;
      background: white;
      text-align: center;
      padding-top: 10rem;
      z-index: 99999;
    }
    #loading {
      color: inherit;
      background: linear-gradient(100deg, #eceff1 30%, #f6f7f8 50%, #eceff1 70%);
      background-size: 400%;
      animation: loading 1.2s ease-in-out infinite;
    }
    
    @keyframes loading {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
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
  events: null,
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
  events: null,
  go: function () {
    closeWidget()
  }
}

function closeWidget() {
  contentRoot.innerHTML = ''
  currentContents = startingContents
}

let startingContents = {
  para: `If you setup a wallet, we can pay you whenever one of your comments is highlighted by an article author. To setup your wallet, please follow the <a href=''>instructions here</a>. Please enter your wallet address below:<br/>
<form id="wallet" class="mailing-list__form" ><input type="text" name="wallet" /><button id="submit-wallet" class="btn btn-primary">Submit wallet</button></form><br/>   
`,
  buttons: [],
  events: function () {
    let input = document.querySelector('input[name=wallet]')
    let walletSubmitForm = document.querySelector('form#wallet')
    walletSubmitForm.addEventListener('submit', function (evt) {
      evt.preventDefault()
      wallet = input.value
      if (wallet === '') {
        return
      }

      if (wallet[0] != '$') {
        return
      } else {
        wallet = wallet.slice(1)
        if (wallet.length === 27) { // Uphold wallet length
          wallet = wallet.split('.').join('-')
        } else {
          return
        }
      }

      pollCheckInterval = setInterval(() => pollForSavedContent('/data/wallets.json', wallet, 'objKeyExist', () => {
        transitionWidget(commenterFlowHandleWalletSuccess);
      }, handleLookupError), 1000);
      commenterFlowSubmitWallet()

    })
  }
}


let currentContents = startingContents; // Global content state

const handleLookupError = () => {
  alert('Lookup failed') // TODO
}

const commenterFlowSubmitWallet = () => {
  let newContents = {
    para: `<span class="loading">Checking for page will update shortly thereafter...</span>
      `,
    events: null,
    buttons: [resetButton]
  }
  let message = {
    contents: { "event_name": "NEW_WALLET", "wallet": `${wallet}`, }
  }
  postMessage(message)
  transitionWidget(newContents)
  showLoadingAnimation()
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
        } else {
          throw new Error('no object found')
        }
      }
      if (dataFormat === 'objKeyExist') {
        let results = data.filter(record => record[desiredData])
        if (results.length > 0) {
          clearInterval(pollCheckInterval)
          success(results)
        } else {
          clearInterval(pollCheckInterval)
          error('wallet not found')
          throw new Error('no object key')
        }
      }

    }
  } catch (e) {
    clearInterval(pollCheckInterval)
    console.log(e)
  }
}

const commenterFlowHandleWalletSuccess = {
  para: `We have received your wallet!<br/>
    You can go ahead and close this window now. If an author chooses to highlight your comment, we will use the wallet you submitted to share some of the page's revenue with you. How's that?!
    `,
  events: null,
  buttons: [closeButton]
}

const menuTemplate = () => {
  return ` 
    <button id="gfw-menu" aria-haspopup="true" aria-expanded="false">⚙     
    </button>
    <div id="gfw-menu-contents" role="menu" hidden="hidden">
        <button role="menuitem" id="btn-claim-article" class="btn btn-primary" tabindex="-1">Claim article authorship</button>
    </div> 
`
}

const template = (content) => {
  return `
<section id="gfw-comments" class="mailing-list mailing-list--wide mailing-list--primary ${content.class ? content.class : ''}">
    <h1 class="sidebar__heading mailing-list__sub-title">Comment Incentives</h1>
    <p class="rich-text mailing-list__text">${content.para}</p>
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
      toggleMenu()
      let message = {
        contents: { "event_name": "AUTHOR_CANDIDATE", "uuid": sessionUUID }
      }
      postMessage(message)
      showLoadingAnimation()
      pollCheckInterval = setInterval(() => pollForSavedContent(`/data/authors/${slug}.json`, sessionUUID, 'objKeyExist', (data) => {
        const uid = data[0][sessionUUID]
        let newContents = {
          para: `Your CoralTalk ID has been stored on the server. Please click the link to email it to Matt: <a href="mailto:matthewlinares@opendemocracy.net?subject=Author CommentID for ${slug}&body=ID:${uid}%0D%0APlease add my ID to Wagtail!">Send CoralID to Matt @ openDemocracy</a><br/>
          Your coral ID: ${uid}

          `,
          buttons: [closeButton]
        }
        updateGfwState({
          coralUserId: uid
        })
        transitionWidget(newContents)
      }, handleLookupError), 1000);
    })
  }




  setMenuListeners()
  contentRoot.innerHTML = template(currentContents)
  updateEventHandlers(currentContents)
}

function transitionWidget(someContents) {
  let clonedContents = Object.assign({}, currentContents);
  let newContents = {
    ...clonedContents,
    ...someContents
  }
  currentContents = newContents
  contentRoot.innerHTML = template(currentContents)
  updateEventHandlers(currentContents)
}

function updateEventHandlers(currentContents) {
  currentContents.buttons.forEach(buttonMeta => {
    let button = document.querySelector(`#${buttonMeta.id}`)
    button.addEventListener('click', buttonMeta.go)
  })
  if (currentContents.events) {
    currentContents.events()
  }

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


const highlightedCommentTemplate = (content) => {
  return `
  <div class="related-story highlighted-comment">
  <h3 class="related-story-suggestion">On <span class="highlighted-comment-date">22-09-2020</span>
      <span class="highlighted-comment-author">${content.commenter_name}</span> commented:</h3>

  <div class="related-story-container">
      <div class="article-list article-list--related-story no-image">
          <div><a class="article-list__title" href="#gfw-menu-container">
                  ${content.chosen_comment.comment.body}
              </a></div>
          <div class="related-story-meta">
              <p>
                  This comment has been highlighted by article author ${content.author_name} and the
                  commenter is enjoying a small percentage of this page's revenue. <a
                      style="font-size: inherit; color: inherit; display: inherit;"
                      class="article-list__title" href="#gfw-menu-container">Find out more</a></p>
          </div>
      </div>
  </div>
</div>
  `
}



async function getHighlightedComment() {
  let meta = document.querySelector('[name="author_comment_id"]')
  if (meta) {
    let authorCommentId = meta.getAttribute('content')

    if (authorCommentId) {
      try {
        let response = await fetch(`{{externalServiceRootUrl}}/data/chosen/${slug}.json`);

        if (response.ok) {
          let data = await response.json();
          if (data.length > 0) {
            data = data[0] // Got multiple comments
            if (data.author_id === authorCommentId) {

              let highlightedCommentBox = document.querySelector('.highlighted-c')
              highlightedCommentBox.innerHTML = highlightedCommentTemplate(data)
            }
          }

        }
      }
      catch (error) {
        console.log(error)
      }
    }
  }
}

function handleCoralReady() {
  coralReadyActions.forEach((action) => action())
}



function clientHandleCoralEvent(events) {

  events.onAny(function (eventName, data) {
    if (eventName === 'ready') {
      handleCoralReady()
    }
    if (eventName === 'signedIn' && gfwCommentsActive) {
      gfwGotSignedInUser({
        loggedIn: true
      });
    }
    if (eventName === 'signOut.success') {
      gfwGotSignedOutUser();
    }
    if (eventName === 'createComment.success') {
      //my_event_tracker.send('createComment', data);
    }
  });
}

async function startRevShare() {
  let monetizationTag = document.querySelector('meta[name=monetization]')
  let odWalletAddress = monetizationTag.getAttribute('content')
  let authorWalletAddress = document.querySelector('meta[name=author_wallet]').getAttribute('content')

  // Define your revenue share here.
  // If these weights add to 100 then they represent the percent each pointer gets.
  const pointers = {
    [`${odWalletAddress}`]: 50,
    [`${authorWalletAddress}`]: 50
  }

  function pickPointer() {
    const sum = Object.values(pointers).reduce((sum, weight) => sum + weight, 0)
    let choice = Math.random() * sum

    for (const pointer in pointers) {
      const weight = pointers[pointer]
      if ((choice -= weight) <= 0) {
        return pointer
      }
    }
  }

  if (authorWalletAddress && odWalletAddress) {
    monetizationTag.remove()
    const newMonetizationTag = document.createElement('meta')
    newMonetizationTag.name = 'monetization'
    newMonetizationTag.content = pickPointer()
    document.head.appendChild(newMonetizationTag)
  }
}
window.addEventListener('load', () => {
  getHighlightedComment()
  checkForLoggedInUser()
  if (document.monetization) { // only run if user has a paying wallet
    startRevShare()
  }

})




function showLoadingAnimation(cb) {
  let loading = document.querySelector('#loading')
  loading.removeAttribute('hidden')
  let ping = setInterval(() => {
    let message = {
      contents: { "event_name": "PING", }
    }
    let coralWindow = getCoralWindow()
    coralWindow.postMessage(message, "{{coralRootUrl}}")
  }, 50);

  const listenForResponse = (event) => {
    if (event.origin !== "{{coralRootUrl}}")
      return;
    if (event.data === "PONG") {
      if (cb) {
        cb()
      }
      setTimeout(function () {
        loading.setAttribute('hidden', 'hidden')
      }, 1000)
      handleCoralReady()

      window.removeEventListener("message", listenForResponse)
      clearInterval(ping)
    }
  }
  window.addEventListener("message", listenForResponse);
}





window.addEventListener("message", (event) => {
  if (event.origin !== "{{coralRootUrl}}")
    return;
  if (event.data === "START_HIGHLIGHT_COMMENT") {
    showLoadingAnimation(function () {
      document.getElementById('highlighted-comment').scrollIntoView({
        behavior: 'smooth'
      });
      getHighlightedComment();
    })
  }
})