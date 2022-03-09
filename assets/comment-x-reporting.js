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
  return `
    <article>
      <h3>${card.slug}</h3>
      ${getUsers(card, 'authors')}
      ${getUsers(card, 'commenters')}
    </article>
  `
}

function getUsers(card, userType) {
  if (card[userType].length > 0)
    return `
  <div>
        <h4>${userType}</h4>
        <ul>
          ${card[userType].map(displayUser)}
        </ul>
      </div>
  `
  return ''
}

function displayUser(item) {
  let card = ''
  if (item.card) {
    card = `
      <dl>
        <dt>Balance</dt>
        <dd>${item.card.balance}</dd>
        <dt>Currency</dt>
        <dd>${item.card.currency}</dd>
      </dl>
    `
  }
  return `
    <li>${item.coralUser} ${card}</li>

  `
}
