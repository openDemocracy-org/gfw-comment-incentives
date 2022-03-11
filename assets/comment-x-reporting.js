async function getData() {
  try {
    const response = await fetch('/data/all-comment-x.json')

    const cards = await response.json()
    renderReport(cards)
  } catch (e) {
    console.error(e)
  }
}

getData()

function renderReport(cards) {
  let root = document.querySelector('#root')
  let content = cards.map((card) => {
    const el = renderTemplate(card)
    return el
  })
  root.innerHTML = content.toString().split(',').join('')
}

function renderTemplate(card) {
  if (card.slug.length < 10) return '' // remove test slugs from staging
  return `
    <article class="slug">
      <h3>${card.slug}</h3>
      ${getHighlightedComment(card)}
      ${getAuthors(card)}
    </article>
  `
}

function getHighlightedComment(card) {
  if (card.commenters.length === 0) return '<p>No highlighted comment found</p>'
  const comments = card.commenters.map((commenter) => {
    return `
      <blockquote>${commenter.comment}</blockquote>
      ${displayUser(commenter, 'h4')}
    `
  })
  return comments
  // Here we display a nice blockquote
  // and the commenter card state
}

function getAuthors(card) {
  const actualAuthor = card.commenters.length > 0 ? card.commenters[0].highlighted_by : null
  const highlightingAuthor = card.authors.filter((author) => author.coralUser === actualAuthor)
  const otherAuthors = card.authors.filter((author) => author.coralUser !== actualAuthor)
  let response = ''
  if (highlightingAuthor.length > 0) {
    response += `<p>Highlighted by:</p>`
    response += `${displayUser(highlightingAuthor[0], 'h4')}`
  }
  if (highlightingAuthor.length > 0 && otherAuthors.length > 0) {
    response += `<p>Other authorship claims:</p>`
  } else if (otherAuthors.length > 0) {
    response += '<p>Authors:</p>'
  }
  if (otherAuthors.length > 0)
    response += `
        <ul>
          ${otherAuthors.map((user) => {
            return `<li>${displayUser(user, 'h4')}</li>`
          })}
        </ul>      
  `
  return response
}

function displayUser(item, userTag) {
  let card = ''
  if (item.card) {
    card = `${item.card.currency === 'GBP' ? '£' : item.card.currency}${item.card.balance}`
  } else {
    card = '🚫'
  }

  if (item.gotUserSubmittedWallet) {
    card = '💰'
  }
  return `
    <${userTag} class="user">${item.username} <span class="wallet">${card}</span></${userTag}>

  `
}
