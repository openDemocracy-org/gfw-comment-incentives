// Global variables

const gfwCommentsActive = true;
let gfwPanelVisible = false;
let gfwStlyesInserted = false;
let contentRoot; // DOM node to hold widget
let wallet, walletCheckInterval;
const body = document.querySelector('body')


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
    #gfw-comments #output {
      box-sizing: border-box;
      background: #222;
      color: #ccffcc;
      border: none;
      height: 5rem;
      min-height: 5rem;
      width: 100%;
      padding: 1rem;
      margin-top: 1rem;
      display: block;
      position: absolute;
      bottom: 0;
      left: 0;
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
  output: "{event: 'login', data: 'something new'}",
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
    walletCheckInterval && clearInterval(walletCheckInterval)
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
      walletCheckInterval = setInterval(() => pollForSavedWallet(), 1000);
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
    output: `{"commenter_wallet": "${wallet}"}`,
    buttons: [resetButton]
  }
  transitionWidget(newContents)
}

async function pollForSavedWallet() {
  try {
    let wresponse = await fetch('{{externalServiceRootUrl}}/data/wallets.json');

    if (wresponse.ok) { // if HTTP-status is 200-299
      // get the response body (the method explained below)
      let wallets = await wresponse.json();

      if (wallets[wallet]) {
        clearInterval(walletCheckInterval)
        transitionWidget(commenterFlowHandleWalletSuccess)
      }
    }
  } catch (e) {
    clearInterval(walletCheckInterval)
  }
}

const commenterFlowHandleWalletSuccess = {
  para: `Wowzers!<br/>
    We have received your wallet!<br/>
    You can go ahead and close this window now. If an author chooses to highlight your comment, we will use the wallet you submitted to share some of the page's revenue with you. How's that?!
    `,
  output: ``,
  buttons: [closeButton, resetButton]
}



// Author flow

const beginAuthorFlow = {
  para: "Hello :)<br/>We need you to send us your author ID. Please <a href=''>click here</a> and copy the long number, and email it to your editor.<br/>",
  buttons: [resetButton]
}






// Template management

const template = (content) => {
  return `
<section id="gfw-comments" class="sidebar sidebar--banner sidebar--banner-blue ${content.class ? content.class : ''}">
    <h1 class="sidebar__heading">Comment Incentives</h1>
    <h2>$ £ ¥ ₹ ₽ 元 ₪ ₯ ₺ </h2>
    <p class="rich-text">${content.para}</p>
    ${content.buttons.map((button) => `<button class="sidebar__link" id="${button.id}">${button.label}</button>`)}
    ${content.output && `<textarea id="output">${content.output}</textarea>`}
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

function gfwGotSignedInUser() {
  const state = {
    loggedIn: true
  }
  let currentState = updateGfwState(state)
  if (currentState.userType === 'author') {
    currentContents = beginAuthorFlow
  } else if (currentState.userType === 'commenter') {
    currentContents = beginCommenterFlow
  } else {
    currentContents = startingContents
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
      gfwGotSignedInUser()
    }
  }
}

checkForLoggedInUser()