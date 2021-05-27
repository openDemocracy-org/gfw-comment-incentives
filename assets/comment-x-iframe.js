const AllowedServerEvents = ['AUTHOR_CANDIDATE', 'NEW_WALLET', 'HIGHLIGHT_COMMENT']
const AllowedDomEvents = ['INIT_HIGHLIGHT_COMMENTS', 'CANCEL_HIGHLIGHT_COMMENTS', 'PING']
let highlightIntervals = [];

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

window.addEventListener('message', (event) => {

  if (event.data.contents) {
    let eventName = event.data.contents.event_name
    if (AllowedDomEvents.includes(eventName) && eventName === 'PING') {
      if (coralRecentlyLoaded) {
        event.source.postMessage('PONG', event.origin);
      }
      return;
    }

    if (AllowedServerEvents.includes(eventName)) {
      let comment = event.data.contents
      submitComment(comment)
      return;
    }
    if (AllowedDomEvents.includes(eventName) && eventName === 'INIT_HIGHLIGHT_COMMENTS') {
      addHighlightEvents(event)
      return;
    }

    if (AllowedDomEvents.includes(eventName) && eventName === 'CANCEL_HIGHLIGHT_COMMENTS') {
      removeHighlightEvents()
    }
  }

}, false);

function submitComment(comment) {
  let commentWindow = document.querySelector('#comments-postCommentForm-field')
  if (commentWindow) {
    commentWindow.innerHTML = `<div>${JSON.stringify(comment)}<br></div>`
    let form = document.querySelector('#comments-postCommentForm-form')
    setTimeout(function () {
      eventFire(form, 'submit')
      commentWindow.innerHTML = ''
      window.location.reload()
    }, 10)
  }

}

function removeHighlightEvents() {
  clearIntervals()
  let gfwButtons = document.querySelectorAll('.gfw-button')
  setTimeout(() => gfwButtons.forEach(button => button.remove()), 200);
}

function clearIntervals() {
  highlightIntervals.map(interval => clearInterval(interval))
  highlightIntervals = []
}

function addHighlightEvents(triggeringEvent) {
  const highlightInterval = setInterval(function () {
    let commentItems = document.querySelectorAll('.coral-comment')
    commentItems.forEach((comment) => {
      let gotButton = comment.getAttribute('gotButton')
      if (!gotButton) {
        let buttonElement = document.createElement('button')
        buttonElement.classList.add('gfw-button')
        const styles = {
          cursor: 'pointer',
          background: '#0162B7',
          color: '#fff',
          padding: '.66667rem 2.66667rem',
          textTransform: 'uppercase',
          fontWeight: '600',
          letterSpacing: '2px',
          cursor: 'pointer',
          border: 'none',
          position: 'relative',
          zIndex: '1000',
          left: '1.5rem',
          fontFamily: "'Open Sans',sans-serif"
        };

        Object.assign(buttonElement.style, styles);

        buttonElement.innerHTML = 'Highlight'
        comment.insertAdjacentElement('afterend', buttonElement)
        buttonElement.addEventListener('click', function () {
          triggeringEvent.source.postMessage({
            'event_name': 'START_LOADING'
          }, triggeringEvent.origin);
          setTimeout(function () { // wait for the loading animation to kick in
            let commenter_name = comment.querySelector('.coral-comment-username span').innerHTML;
            let timestamp = comment.querySelector('.coral-comment-timestamp').getAttribute('datetime');
            let comment_id = comment.getAttribute('id')
            let commentHTML = comment.querySelector('.coral-comment-content').innerHTML
            let text = commentHTML.replace(/"/g, "'")
            let commentWithMeta = {
              'event_name': 'HIGHLIGHT_COMMENT',
              'commenter_comment': text,
              'timestamp': timestamp,
              'commenter_name': commenter_name,
              'comment_id': comment_id
            }
            triggeringEvent.source.postMessage({
              'event_name': 'START_HIGHLIGHT_COMMENT',
              'comment': commentWithMeta
            }, triggeringEvent.origin);

            submitComment(commentWithMeta)
          }, 100)
        })
        comment.setAttribute('gotButton', true)
      }

    })
  }, 1000)
  highlightIntervals.push(highlightInterval)
}