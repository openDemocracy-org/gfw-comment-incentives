const gfwCommentsActive = true;
let gfwPanelVisible = false;
let gfwStlyesInserted = false;
let wallet, walletCheckInterval;
const body = document.querySelector('body')



const contents = {
  para: "Ready to try something?",
  output: "{event: 'login', data: 'something new'}",
  buttons: [
    {
      label: "I'm an author",
      id: "button1",
      go: function () {
        beginAuthorFlow()
      }
    }, {
      label: "I'm a commenter",
      id: "button2",
      go: function () {
        beginCommenterFlow()
      }
    }]
}

const resetButton = {
  label: "Reset",
  id: "reset-button",
  go: function () {
    gfwUpdateContents(contents)
  }
}

const closeButton = {
  label: "Close",
  id: "close-button",
  go: function () {
    alert('closing TODO')
  }
}

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

function insertStyles() {
  let node = document.createElement("style")
  let styleEl = document.querySelector('head').appendChild(node)
  styleEl.innerHTML = styles()
  gfwStlyesInserted = true;
}

function insertContent() {
  !gfwStlyesInserted && insertStyles()
  let node = document.createElement('div')
  node.setAttribute('id', 'gfw-root')
  let contentRoot = body.appendChild(node)
  contentRoot.innerHTML = template(contents)
  updateEventHandlers(contents)
}

function updateEventHandlers(newContents) {
  newContents.buttons.forEach(buttonMeta => {
    let button = document.querySelector(`#${buttonMeta.id}`)
    button.addEventListener('click', buttonMeta.go)
  })
}

function updateContent(newContent) {
  let contentRoot = document.querySelector('#gfw-root')
  contentRoot.innerHTML = template(newContent)
}

function gfwGotSignedInUser() {
  insertContent();
}

function gfwUpdateContents(someContents) {
  let clonedContents = Object.assign({}, contents);
  let newContents = {
    ...clonedContents,
    ...someContents
  }
  updateContent(newContents)
  updateEventHandlers(newContents)
}


function beginAuthorFlow() {
  let newContents = {
    para: "Hello :)<br/>We need you to send us your author ID. Please <a href=''>click here</a> and copy the long number, and email it to your editor.<br/>",
    buttons: [resetButton]
  }
  gfwUpdateContents(newContents)
}

function beginCommenterFlow() {
  let newContents = {
    para: `Hello :)<br/>
    If you setup a wallet, we can pay you whenever one of your comments is highlighted by an article author.<br/>
    To setup your wallet, please follow the <a href=''>instructions here</a>
    `,
    buttons: [{
      label: "I've done that",
      id: "done-that",
      go: function () {
        commenterFlowGetWallet()
      }
    }, resetButton]
  }
  gfwUpdateContents(newContents)
}

function commenterFlowGetWallet() {
  let newContents = {
    para: `Great :)<br/><br/>
    Please enter your wallet address below:<br/>
    <input type="text" name="wallet" /><br/>   
    `,

    buttons: [{
      label: "Submit wallet",
      id: "submit-wallet",
      go: function () {
        let input = document.querySelector('input[name=wallet]')
        wallet = input.value
        commenterFlowSubmitWallet()
      }
    }, resetButton]
  }
  gfwUpdateContents(newContents)
}

function commenterFlowSubmitWallet() {
  let newContents = {
    para: `Excellent :)<br/>
    In the box at the bottom is some code. We need you to submit it as a comment (Matt - this will be done via JS in future). Please paste it into the comment box and submit.<br/>
    <span class="loading">Waiting for you to submit... page will update shortly thereafter...</span>
    `,
    output: `{"commenter_wallet": "${wallet}"}`,
    buttons: [resetButton]
  }
  walletCheckInterval = setInterval(() => pollForSavedWallet(), 1000);
  gfwUpdateContents(newContents)
}


async function pollForSavedWallet() {
  let wresponse = await fetch('https://comment-incentives.staging-caprover.opendemocracy.net/wallets.json');

  if (wresponse.ok) { // if HTTP-status is 200-299
    // get the response body (the method explained below)
    let wallets = await wresponse.json();
    if (wallets[wallet]) {
      clearInterval(walletCheckInterval)
      commenterFlowHandleWalletSuccess()
    }
  } else {
    alert("HTTP-Error: " + response.status);
  }
}


function commenterFlowHandleWalletSuccess() {
  let newContents = {
    para: `Wowzers!<br/>
    We have received your wallet!<br/>
    You can go ahead and close this window now. If an author chooses to highlight your comment, we will use the wallet you submitted to share some of the page's revenue with you. How's that?!
    `,
    output: ``,
    buttons: [closeButton, resetButton]
  }
  gfwUpdateContents(newContents)
}


