const AllowedServerEvents = ['AUTHOR_CANDIDATE', 'NEW_WALLET', 'HIGHLIGHT_COMMENT']
const AllowedDomEvents = ['INIT_HIGHLIGHT_COMMENTS']

function eventFire(el, etype) {
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}

window.addEventListener("message", (event) => {
  if (event.origin !== "{{externalServiceRootUrl}}") {
    return;
  }
  if (event.data.contents) {
    if (AllowedServerEvents.includes(event.data.contents.event_name)) {
      let comment = event.data.contents
      submitComment(comment)
    }
    if (AllowedDomEvents.includes(event.data.contents.event_name)) {
      addHighlightEvents()
    }
  }

}, false);

function submitComment(comment) {
  let commentWindow = document.querySelector('#comments-postCommentForm-field')
  commentWindow.innerHTML = `<div>${JSON.stringify(comment)}<br/></div>`
  let form = document.querySelector('#comments-postCommentForm-form')
  setTimeout(function () {
    eventFire(form, 'submit')
    commentWindow.innerHTML = ''
    window.location.reload()
  }, 10)
}

function addHighlightEvents() {


  setInterval(function () {
    let commentItems = document.querySelectorAll('.coral-comment-content')
    commentItems.forEach((comment) => {
      let gotButton = comment.getAttribute('gotButton')
      if (!gotButton) {
        let buttonElement = document.createElement('button')
        buttonElement.innerHTML = 'Highlight comment'
        comment.insertAdjacentElement("afterend", buttonElement)
        buttonElement.addEventListener('click', function () {
          let b1 = comment.innerHTML.split('<div>')[1]
          let b2 = b1.split('</div>')[0]
          let b3 = b2.split('<br>')[0]

          submitComment({ "event_name": "HIGHLIGHT_COMMENT", "commenter_comment": b3 })
        })
        comment.setAttribute('gotButton', true)
      }




    })
  }, 1000)

} 