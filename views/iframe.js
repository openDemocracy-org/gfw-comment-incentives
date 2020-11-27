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
  if (event.data.id === 'COMMENTER_NEW_WALLET') {
    let comment = event.data.contents
    let commentWindow = document.querySelector('#comments-postCommentForm-field')
    commentWindow.innerHTML = `<div>${JSON.stringify(comment)}<br/></div>`
    let form = document.querySelector('#comments-postCommentForm-form')
    setTimeout(function () {
      eventFire(form, 'submit')
      commentWindow.innerHTML = ''
      window.location.reload(true)
    }, 10)
  }
}, false);