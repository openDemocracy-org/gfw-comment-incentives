const AllowedServerEvents = ['AUTHOR_CANDIDATE', 'NEW_WALLET', 'HIGHLIGHT_COMMENT']
const AllowedDomEvents = ['INIT_HIGHLIGHT_COMMENTS', 'PING']

let coralRecentlyLoaded = true;
setTimeout(function () {
  coralRecentlyLoaded = false
}, 1000)

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

  if (event.data.contents) {
    let eventName = event.data.contents.event_name
    if (AllowedDomEvents.includes(eventName) && eventName === 'PING') {
      if (coralRecentlyLoaded) {
        event.source.postMessage("PONG", event.origin);
      }
      return;
    }

    if (AllowedServerEvents.includes(eventName)) {
      let comment = event.data.contents
      submitComment(comment)
    }
    if (AllowedDomEvents.includes(eventName)) {
      addHighlightEvents(event)
    }
  }

}, false);

function submitComment(comment) {
  let commentWindow = document.querySelector('#comments-postCommentForm-field')
  commentWindow.innerHTML = `<div>${JSON.stringify(comment)}<br></div>`
  let form = document.querySelector('#comments-postCommentForm-form')
  setTimeout(function () {
    eventFire(form, 'submit')
    commentWindow.innerHTML = ''
    window.location.reload()
  }, 10)
}

function addHighlightEvents(triggeringEvent) {


  setInterval(function () {
    let commentItems = document.querySelectorAll('.coral-comment')
    commentItems.forEach((comment) => {
      let gotButton = comment.getAttribute('gotButton')
      if (!gotButton) {
        let buttonElement = document.createElement('button')
        buttonElement.innerHTML = 'Highlight comment'
        comment.insertAdjacentElement("afterend", buttonElement)
        buttonElement.addEventListener('click', function () {
          triggeringEvent.source.postMessage("START_HIGHLIGHT_COMMENT", triggeringEvent.origin);
          setTimeout(function () { // wait for the loading animation to kick in
            let commenter_name = comment.querySelector('.coral-comment-username span').innerHTML;
            let timestamp = comment.querySelector('.coral-comment-timestamp').getAttribute('datetime');
            let comment_id = comment.getAttribute('id')
            let commentHTML = comment.querySelector('.coral-comment-content').innerHTML
            let commentWithMeta = {
              "event_name": "HIGHLIGHT_COMMENT",
              "commenter_comment": commentHTML,
              "timestamp": timestamp,
              "commenter_name": commenter_name,
              "comment_id": comment_id
            }

            submitComment(commentWithMeta)
          }, 100)
        })
        comment.setAttribute('gotButton', true)
      }

    })
  }, 1000)
} 