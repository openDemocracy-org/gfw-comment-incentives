// Global variables

const gfwCommentsActive = true;
let gfwPanelVisible = false;
let gfwStlyesInserted = false;
let menuRoot = document.getElementById('gfw-menu-container')
let contentRoot = document.getElementById('gfw-widget'); // DOM node to hold widget
const widgetTitle = 'Better comments online'

// What mode are we in?

// Check for approved author
let authorCommentMeta = document.querySelector('[name="author_comment_id"]');
let authorCommentId = false;
if (authorCommentMeta) {
  authorCommentId = authorCommentMeta.getAttribute('content') != 'None' ? authorCommentMeta.getAttribute('content') : false;
}

let gotMonetizationTag = document.querySelector('meta[name=monetization]')
let wallet;
let gfwMenuButton;
const body = document.querySelector('body')
const coralReadyActions = []
let pollListeners = []

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let sessionUUID = uuidv4()
const slug = getSlugFromUrl(window.location.pathname)

// Styles for page injection

const styles = () => {
  return `
    #gfw-widget {
      clear: both;      
      width: 100%;
      display: flex;
      align-items:center;
    }

    #gfw-widget.minimized #gfw-comments {
      display: none
    }

    .minimized-contents {
      display: none;
    }

    .minimized-contents button {
      cursor: pointer;
    }

    #gfw-widget.minimized .minimized-contents {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .gfw-comments {
      background: #f1f6fb;
      position: relative;
      padding-top: 40px;
      overflow-x: hidden;
      overflow-y: auto; 
      margin: 0 auto 2rem;
  }
    @media (min-width: 600px) {
      #gfw-widget {
        position: fixed;
        right: 1rem;
        bottom: 3rem;
        z-index: 2;
      }
      .gfw-comments { 
        width: 500px;
        margin-bottom: 0rem;
        border-radius: 10px;
        box-shadow: 0px 0px 0px -4px rgba(39,55,74,.25), 0 15px 40px 10px rgba(39,55,74,.25);
    }
    }

    #gfw-comments h1 {
        font-size: 1.4rem;
        margin-bottom: 0;
        line-height: 1rem;
    }
    #gfw-comments h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: #98D7FF;
    }
    #gfw-comments .explainer-box .learn-more-text {
      color: black; 
      text-decoration: underline;
    }

    #gfw-comments .explainer-box .learn-more-text:hover {
      text-decoration: none; 
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
    #gfw-widget #maximize-widget {
      color: white;
      background-color: #0162B7;
      font-weight: bold;
      padding: 15px 20px;
    }
    #gfw-widget #maximize-widget:hover {
      background-color: rgb(38, 136, 227);
    }

    #gfw-comments .top-button {
      color: #9B9B9B;
      background-color: #f1f6fb;
    }

    #gfw-comments .top-button:hover {
      text-decoration: underline;
    }

    #gfw-comments .rich-text a {
      color: white;
      text-underline-position: auto;
    }

    #gfw-comments p {
      margin: 0.75rem 0 1rem 0;
      line-height: 1.47;
      padding: 0 2rem;
      font-size: 16px;
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

    .top-bar {
      position: absolute;
      top: 0;
      right: 0.5rem;
    }

    #gfw-menu-container {      
      position: absolute;
      right: 2.66667rem;
      float: right;
      width: 50%;
      text-align: right;
      z-index:2;
    }
    #gfw-menu-contents {
      width: 100%;
    }
    #coral_thread_container {
      position: relative;
      min-height: 723px;
    }
    #loading {
      position: absolute;
      width: 102%;
      height: 3000px;
      left: -1%;
      top: 0;
      right: 0;
      background: white;
      text-align: center;
      padding-top: 10rem;
      z-index: 1;
    }
    #loading {
      color: inherit;
      background: linear-gradient(100deg, #eceff1 30%, #f6f7f8 50%, #eceff1 70%);
      background-size: 400%;
      animation: loading 1.2s ease-in-out infinite;
    }

    .rich-text div {
      color: #000;
      font-weight: 400;
      font-size: 1.13333rem;
      line-height: 1.86667rem;
      -webkit-font-smoothing: antialiased;
      text-transform: none;
      margin: 0 0 1rem 0;
    }

    input[name=wallet] {
      width: inherit;
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
  let node = document.createElement('style')
  let styleEl = document.querySelector('head').appendChild(node)
  styleEl.innerHTML = styles()
  gfwStlyesInserted = true;
}

// Generic components and actions

const resetButton = {
  label: 'Reset',
  id: 'reset-button',
  events: null,
  go: function () {
    updateGfwState({
      userType: undefined
    })
    transitionWidget(startingContents)
  }
}

const closeButton = {
  label: 'Close',
  id: 'close-button',
  events: null,
  go: function () {
    closeWidget()
  }
}

const minimizeButton = {
  label: 'Minimize',
  id: 'minimize-button',
  events: null,
  go: function () {
    minimizeWidget()
  }
}

function minimizeWidget() {
  contentRoot.classList.add('minimized');
  document.querySelector('.minimized-contents').setAttribute('aria-hidden', 'false');
  document.querySelector('#maximize-widget').addEventListener('click', maximizeWidget)
}

function maximizeWidget() {
  contentRoot.classList.remove('minimized')
  document.querySelector('.minimized-contents').setAttribute('aria-hidden', 'true')
  document.querySelector('#maximize-widget').removeEventListener('click', maximizeWidget)
}

function closeWidget() {
  contentRoot.innerHTML = ''
  currentContents = startingContents
}

let startingMonetizationContents = {
  title: `Better comments online?`,
  para: `Want to support authors and commenters on openDemocracy? Try our reward system and help us build a better web. <a href='/rewardcomments' target='_blank' class="learn-more-text">Learn more »</a>`,
  topButtons: [minimizeButton],
  buttons: [{
    label: "Count me in",
    id: 'proceed-button',
    events: null,
    go: function () {
      transitionWidget(secondMonetizationContents)
    }
  }]
}

let secondMonetizationContents = {
  title: widgetTitle,
  para: `If you've set up a digital wallet, we can share micropayments whenever one of your comments is highlighted by an article author.<br/> <a href="/rewardcomments" target="_blank" class="learn-more-text">Read the instructions »</a><br/><br/> Please enter your wallet address below:<br/>
<form id="wallet" class="mailing-list__form" ><input type="text" name="wallet" /><button id="submit-wallet" class="btn btn-primary">Submit wallet</button></form><span class="gfw-notice"></span>
`,
  hidden: false,
  buttons: [],
  topButtons: [minimizeButton],
  events: function () {
    let input = document.querySelector('input[name=wallet]')
    let walletSubmitForm = document.querySelector('form#wallet')
    let walletNotice = document.querySelector('.gfw-notice')
    let walletInput = document.querySelector('input[name=wallet]')
    walletInput && walletInput.addEventListener('keydown', function (evt) {
      walletNotice.innerHTML = ''
    })
    walletSubmitForm && walletSubmitForm.addEventListener('submit', function (evt) {
      evt.preventDefault()
      wallet = input.value
      if (wallet === '') {
        walletNotice.innerHTML = 'Please enter a wallet'
        return
      }

      if (wallet[0] != '$') {
        walletNotice.innerHTML = 'Please ensure your wallet is in the correct format'
        return
      } else {
        wallet = wallet.slice(1)
        if (wallet.length === 27) { // Uphold wallet length
          wallet = wallet.split('.').join('-')
        } else {
          walletNotice.innerHTML = 'Please ensure you enter the correct number of characters'
          return
        }
      }

      let walletLookup = [{
        key: 'wallet',
        value: wallet
      }]

      const pollCheckInterval = setInterval(() => pollForSavedContent('/data/all-wallets.json', walletLookup, 'objEq', () => {
        transitionWidget(commenterFlowHandleWalletSuccess);
        clearAllPolls()
      }, function (error) {
        handleLookupError("We can't find your wallet on the server. Please make sure you are logged in as a normal user i.e. not a Coral moderator, editor, or admin and try again.", error)
      }), 1000);
      pollListeners.push(pollCheckInterval)
      commenterFlowSubmitWallet()

    })
  }
}

let startingStandardContents = {
  title: '',
  para: '',
  hidden: true,
  buttons: [],
  topButtons: [],
  events: null
}


let state = getState();
let monetizationContents = state.walletSubmitted ? startingStandardContents : startingMonetizationContents
let startingContents = gotMonetizationTag ? monetizationContents : startingStandardContents;
let currentContents = startingContents; // Global content state

const commenterFlowSubmitWallet = () => {
  let newContents = {
    title: widgetTitle,
    para: `<span class="loading">Checking for page will update shortly...</span>
      `,
    hidden: false,
    events: null,
    buttons: [],
    topButtons: [minimizeButton]
  }
  let message = {
    contents: { 'event_name': 'NEW_WALLET', 'wallet': `${wallet}`, }
  }
  postMessage(message)
  transitionWidget(newContents)
  showLoadingAnimation('Submitting wallet') // No callback as polling will trigger transition
}

function clearAllPolls() {

  pollListeners.map(interval => clearInterval(interval))
  pollListeners = []

}

async function pollForSavedContent(path, desiredData, dataFormat, success, error) {

  try {
    let response = await fetch(`{{externalServiceRootUrl}}${path}`);
    if (response.ok) { // if HTTP-status is 200-299
      // get the response body (the method explained below)
      let data = await response.json();
      const foundItem = data.map(comment => {
        if (dataFormat === 'objEq') {
          if (comment[desiredData[0].key] === desiredData[0].value) {
            if (desiredData.length > 1) {
              if (comment[desiredData[1].key] === desiredData[1].value) {
                success(comment)
                return true;
              } else {
                return false
              }
            } else {
              success(comment)
              return true
            }
          }
        }
      })
      //console.log(foundItem) TODO: check if map returns anything and return error if not

      if (dataFormat === 'objKeyExist') {
        let results = data.filter(record => record[desiredData])
        if (results.length > 0) {
          success(results)
        } else {
          throw new Error('no object key')
        }
      }

    }
  } catch (e) {
    error(e)
  }
}

const handleLookupError = (message, error) => {
  clearAllPolls()
  setTimeout(clearAllPolls, 500) // Just in case!
  let errorContents = {
    title: widgetTitle,
    para: message,
    hidden: false,
    buttons: [],
    topButtons: [closeButton]
  }
  transitionWidget(errorContents)
  console.error(error)
}

const commenterFlowHandleWalletSuccess = {
  title: widgetTitle,
  para: `We have received your wallet!<br/>
    If an author chooses to highlight your comment, we will use it to share some of the page's revenue with you :)
    `,
  hidden: false,
  events: () => {
    updateGfwState({
      walletSubmitted: true
    })
  },
  buttons: [closeButton],
  topButtons: [minimizeButton]
}

const menuTemplate = () => {
  return ` 
    <button id="gfw-menu" aria-haspopup="true" aria-expanded="false">⚙     
    </button>
    <ul id="gfw-menu-contents" role="menu" hidden="hidden">
        <li><button role="menuitem" id="btn-claim-article" class="btn btn-primary" tabindex="-1">Claim article authorship</button></li>
        <li><button role="menuitem" id="btn-add-wallet" class="btn btn-primary" tabindex="-1">Submit wallet</button></li>
    </ul> 
`
}

const template = (content) => {
  return `
<div class="minimized-contents gfw-comments aria-hidden="true"><button id="maximize-widget">${content.title}</button></div>  
<section id="gfw-comments" class="donation-cta-contentbottom gfw-comments" ${content.hidden ? 'hidden="hidden"' : ''}>
    <div class="top-bar">${content.topButtons.map((button) => `<button class="top-button" id="${button.id}">${button.label}</button>`).join('')}</div>
    <h1 class="sidebar__heading mailing-list__sub-title">${content.title}</h1>
    <p class="explainer-box">${content.para}</p>
    ${content.buttons.map((button) => `<button class="main-button btn btn-primary" id="${button.id}">${button.label}</button>`).join('')}
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
  showCogMenu()
  contentRoot.innerHTML = template(currentContents)
  updateEventHandlers(currentContents)
}

function showCogMenu() {
  menuRoot.innerHTML = menuTemplate()
  gfwMenuButton = document.querySelector('button#gfw-menu');


  gfwMenuButton.addEventListener('click', toggleMenu)
  gfwMenuButton.addEventListener('keydown', function (evt) {
    if (evt.keyCode === 40) {
      toggleMenu()
    }
  })

  // Add wallet
  let btnAddWallet = document.querySelector('#btn-add-wallet')
  btnAddWallet.addEventListener('click', () => {
    toggleMenu(); // Hide the button
    transitionWidget(secondMonetizationContents)
  })
  // Claim article authorship
  let btnClaimArticle = document.querySelector('#btn-claim-article')
  let state = getState()
  let loadingString = 'Claiming article authorship';
  if (state.authorshipClaimed) {
    btnClaimArticle.innerText = 'Enable comment highlighting'
    loadingString = 'Enabling comment highlighting'
  }
  btnClaimArticle.addEventListener('click', () => handleAuthorshipClaim(loadingString))
}

function hideCogMenu() {
  menuRoot.innerHTML = ''
}


function handleAuthorshipClaim(loadingString) {
  toggleMenu(); // Hide the button
  postMessage({
    contents: { 'event_name': 'AUTHOR_CANDIDATE', 'uuid': sessionUUID }
  })
  showLoadingAnimation(loadingString);
  const pollCheckInterval = setInterval(() => pollForSavedContent(`/data/authors/${slug}.json`, sessionUUID, 'objKeyExist', (data) => {

    clearAllPolls()
    const uid = data[0][sessionUUID] // pluck their coralId
    const currentState = updateGfwState({
      coralUserId: uid,
      authorshipClaimed: true
    })

    let nextContents = initHighlightForAuthor(currentState);
    transitionWidget(nextContents);

  }, function (error) {
    handleLookupError(`There has been an error retrieving your CoralID. Please refresh the page and try again, making sure you are not logged in as a Coral editor, moderator or admin.`, error)
  }), 1000);
  pollListeners.push(pollCheckInterval)
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
  maximizeWidget()
}

function updateEventHandlers(currentContents) {
  currentContents.buttons.forEach(buttonMeta => {
    let button = document.querySelector(`#${buttonMeta.id}`)
    button.addEventListener('click', buttonMeta.go)
  })
  currentContents.topButtons.forEach(buttonMeta => {
    let button = document.querySelector(`#${buttonMeta.id}`)
    button.addEventListener('click', buttonMeta.go)
  })
  if (currentContents.events) {
    currentContents.events()
  }

}

// State handlers

function getState() {
  let lsState = localStorage.getItem('gfwState');
  let state;
  if (lsState) {
    state = JSON.parse(lsState)
  } else {
    state = {}
  }
  return state;
}

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
  let nextContents = initHighlightForAuthor(currentState);
  currentContents = !nextContents ? startingContents : nextContents;
  insertContent();
}

function gfwGotSignedOutUser() {
  const state = {
    loggedIn: false,
    coralUserId: null
  }
  sessionUUID = uuidv4()
  updateGfwState(state)
  postMessage({
    contents: { 'event_name': 'CANCEL_HIGHLIGHT_COMMENTS' }
  })
  closeWidget()
  hideCogMenu()
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
function initHighlightForAuthor(currentState) {
  let customMessage;
  if (authorCommentId && currentState.coralUserId && authorCommentId === currentState.coralUserId) {
    // they are the author
    customMessage = 'Your Coral account has been verified as the author of this article. You can now use the highlight comment buttons in the comment thread to pick a highlighted comment';
    coralReadyActions.push(function () {
      let message = {
        contents: { 'event_name': 'INIT_HIGHLIGHT_COMMENTS' }
      }
      postMessage(message)
    })
    handleCoralReady()
  } else if (authorCommentId && currentState.coralUserId && authorCommentId !== currentState.coralUserId) {
    customMessage = 'We have verified another account as the author of this article. Please check and try again.'
  } else if (!authorCommentId && currentState.coralUserId) {
    customMessage = `Your authorship claim has been received and will shortly be confirmed by an openDemocracy editor. You will receive an email letting you know when you can come back and highlight comments.</a>
      `
  } else if (currentState.coralUserId === null && currentState.authorshipClaimed) {
    customMessage = 'Please use the button under the cog to enable highlighting, you have logged out and in again.'
  } else {
    return false
  }
  return newContents = {
    title: widgetTitle,
    para: customMessage,
    hidden: false,
    buttons: [],
    topButtons: [closeButton]
  }
}

function getCoralWindow(comment) {
  try {
    var iframe = document.querySelector('#coral_thread_iframe');
    var coralWindow = iframe.contentWindow;
    return coralWindow
  }
  catch (error) {
    console.error(error)
    let errorContents = {
      title: widgetTitle,
      para: `We have encountered an error connecting to Coral. The event that ran too soon was ${comment.contents.event_name}. Please make a note of this and report it to Matt or Ali. Thank you. You can dismiss this window and continue if Coral is appearing correctly below.`,
      hidden: false,
      topButtons: [closeButton],
      buttons: []
    }
    transitionWidget(errorContents)
    return false;
  }
}

function postMessage(comment) {
  let coralWindow = getCoralWindow(comment)
  if (coralWindow) {
    coralWindow.postMessage(comment, '{{coralRootUrl}}')
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
  <div class="related-story highlighted-comment" data-comment-id="${content.comment_id}">
    <h3 class="related-story-suggestion">Highlighted comment, by <span class="highlighted-comment-author">${content.commenter_name}</span>
    </h3>
    <div class="related-story-container">
      <div class="article-list article-list--related-story no-image">
        <div class="article-page__rich-text">
          <div class="rich-text">       
            ${content.commenter_comment}       
          </div>
        </div>
      </div>
      <div class="related-story-meta">
        <p>This comment has been highlighted by the article's author and the commenter is enjoying a small percentage of this page's revenue. <a style="font-size: inherit; color: inherit;" class="article-list__title" href="/rewardcomments">Find out more</a></p>
      </div>
    </div>
  </div>
  `
}



async function getHighlightedComment() {
  if (authorCommentId) {
    try {
      let response = await fetch(`{{externalServiceRootUrl}}/data/chosen/${slug}.json`);

      if (response.ok) {
        let data = await response.json();
        if (data.length > 0) {
          let chosenComment = data.filter(comment => comment.author_id === authorCommentId)
          data = chosenComment[0]
          if (data.author_id === authorCommentId) {
            let highlightedCommentBox = document.querySelector('#highlighted-comment')
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
  if (monetizationTag) {
    let odWalletAddress = monetizationTag.getAttribute('content')
    let authorId = document.querySelector('meta[name=author_comment_id]').getAttribute('content')
    try {
      let response = await fetch(`{{externalServiceRootUrl}}/data/wallets/${slug}.json?author=${authorId}`);
      if (response.ok) {
        let data = await response.json();
        if (!data.gotWallet) {
          console.log('GFW Got no wallets, defaulting to 100% oD revenue.')
          return
        }
        let pointers;
        if (data.authorWallet && data.commenterWallet) {
          pointers = {
            [`${odWalletAddress}`]: 45,
            [`${data.authorWallet}`]: 45,
            [`${data.commenterWallet}`]: 10
          }
          console.log('GFW Got wallets for author and commenter, 45 45 10.')

        } else if (data.authorWallet) {
          pointers = {
            [`${odWalletAddress}`]: 50,
            [`${data.authorWallet}`]: 50
          }
          console.log('GFW Got wallet for author, 50 50.')
        } else if (data.commenterWallet) {
          pointers = {
            [`${odWalletAddress}`]: 90,
            [`${data.commenterWallet}`]: 10
          }
          console.log('GFW Got wallet for commenter, 90 10.')
        }
        console.log(pointers)
        performCalculations(pointers)
      }
    } catch (e) {
      console.log(e)
    }
  }


  function performCalculations(pointers) {

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

    monetizationTag.remove()
    const newMonetizationTag = document.createElement('meta')
    newMonetizationTag.name = 'monetization'
    newMonetizationTag.content = pickPointer()
    document.head.appendChild(newMonetizationTag)
    console.log('Monetization tag appended!')
    if (window.initMonetizationAnalytics) {
      window.initMonetizationAnalytics()
    } else {
      console.log('No monetization analytics function found')
    }
  }
}

window.addEventListener('load', () => {
  getHighlightedComment()
  checkForLoggedInUser()
  if (document.monetization) { // only run if user has a paying wallet
    startRevShare()
  }
})

function showLoadingAnimation(customMessage, cb) {
  let contents = {
    title: widgetTitle,
    para: customMessage,
    hidden: false,
    buttons: [],
    topButtons: [minimizeButton]
  }
  transitionWidget(contents)
  let loading = document.querySelector('#loading')
  loading.removeAttribute('hidden')
  if (customMessage) {
    loading.innerHTML = customMessage
  }
  let ping = setInterval(() => {
    let message = {
      contents: { 'event_name': 'PING', }
    }
    let coralWindow = getCoralWindow()
    coralWindow.postMessage(message, '{{coralRootUrl}}')
  }, 50);

  const listenForResponse = (event) => {
    if (event.origin !== '{{coralRootUrl}}')
      return;
    if (event.data === 'PONG') {
      if (cb) {
        cb()
      }
      setTimeout(function () {
        loading.setAttribute('hidden', 'hidden')
      }, 1000)
      handleCoralReady()

      window.removeEventListener('message', listenForResponse)
      clearInterval(ping)
    }
  }
  window.addEventListener('message', listenForResponse);
}


function checkHighlightedComment(comment, commentFromIframe) {


  const scrollButton = {
    label: 'View highlighted comment',
    id: 'scroll-button',
    events: null,
    go: function () {
      document.getElementById('highlighted-comment').scrollIntoView({
        behavior: 'smooth'
      });
    }
  }

  let customMessage;
  let gotScrollButton = false;
  if (!comment) {
    customMessage = 'No comment found, please check and try again.';
  } else {
    console.log('comment from server:')
    console.log(comment)
    console.log('comment from iframe:')
    console.log(commentFromIframe)
    if (comment.author_id === authorCommentId && commentFromIframe.comment_id === comment.comment_id) {
      // they are the author and it's a valid comment
      customMessage = 'Successfully highlighted comment';
      gotScrollButton = true;
    } else {
      customMessage = 'Error highlighting comment :(';
    }
  }
  let newContents = {
    title: widgetTitle,
    para: customMessage,
    hidden: false,
    buttons: [],
    topButtons: [minimizeButton]
  }

  gotScrollButton && newContents.buttons.push(scrollButton)

  return newContents;
}

window.addEventListener('message', (event) => {
  if (event.origin !== '{{coralRootUrl}}')
    return;

  if (event.data.event_name === 'START_LOADING') {
    showLoadingAnimation('Loading')
  }

  if (event.data.event_name === 'START_HIGHLIGHT_COMMENT') {
    showLoadingAnimation('Highlighting comment', function () {

      let commentFromIframe = event.data.comment
      let validComment = [{
        key: 'comment_id',
        value: commentFromIframe.comment_id
      }, {
        key: 'author_id',
        value: authorCommentId
      }]

      // Poll for highlighted comment
      const pollCheckInterval = setInterval(() => pollForSavedContent(`/data/chosen/${slug}.json`, validComment, 'objEq', (commentFromServer) => {
        clearAllPolls()
        let nextContents = checkHighlightedComment(commentFromServer, commentFromIframe);
        transitionWidget(nextContents);
        getHighlightedComment();

      }, function (error) {
        handleLookupError(`There has been an error highlighting the comment. Please refresh the page and try again, making sure you logged in as the article author.`, error)
      }), 1000);
      pollListeners.push(pollCheckInterval)

    })
  }

})