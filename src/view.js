import onChange from 'on-change'

const watchState = (state, elements, i18nextInstance, FORM_STATES) =>
  onChange(state, (path) => {
    console.log(state)
    if (path.startsWith('form')) {
      renderForm(state.form, elements, FORM_STATES)
    }
    else if (path === 'feeds' || path.startsWith('posts')) {
      renderContent(state, i18nextInstance, elements)
    }
    else if (path === 'ui.visitedPosts') {
      markVisitedPosts(state.ui.visitedPosts)
    }
  })

const renderForm = (formstate, pageElements, FORM_STATES) => {
  if (formstate.state === FORM_STATES.LOADING) {
    pageElements.formInput.disabled = true
    pageElements.formBtn.disabled = true
  }
  else {
    pageElements.formInput.disabled = false
    pageElements.formBtn.disabled = false
    if (formstate.isValid) {
      pageElements.formInput.value = ''
    }
    pageElements.formInput.focus()
  }

  if (!formstate.isValid) {
    pageElements.formInput.classList.add('is-invalid')
  }
  else {
    pageElements.formInput.classList.remove('is-invalid')
  }

  pageElements.errField.textContent = formstate.error ? formstate.error : ''
  pageElements.errField.classList.remove('text-success')
  pageElements.errField.classList.add('text-danger')
}

const renderContent = (watchedState, i18next, pageElements) => {
  const { posts, feeds, ui: { visitedPosts } } = watchedState

  const oldWrapper = document.querySelector('#contentWrapper')
  if (oldWrapper) {
    oldWrapper.remove()
  }

  const wrapper = document.createElement('section')
  wrapper.className = 'container-fluid container-xxl p-5'
  wrapper.id = 'contentWrapper'

  const row = document.createElement('div')
  row.className = 'row'

  // Posts column
  const postsCol = document.createElement('div')
  postsCol.className = 'col-md-10 col-lg-8 order-1 mx-auto posts'

  const postsCard = document.createElement('div')
  postsCard.className = 'card border-0'

  const postsCardBody = document.createElement('div')
  postsCardBody.className = 'card-body'

  const postsTitle = document.createElement('h2')
  postsTitle.className = 'card-title h4'
  postsTitle.textContent = i18next.t('posts.header')

  postsCardBody.appendChild(postsTitle)

  const postsList = document.createElement('ul')
  postsList.className = 'list-group border-0 rounded-0'

  Object.entries(posts).forEach(([feedKey, feedPosts]) => {
    feedPosts.forEach((post) => {
      const postElement = createPostElement(post, feedKey, visitedPosts, i18next)
      postsList.appendChild(postElement)
    })
  })

  postsCard.appendChild(postsCardBody)
  postsCard.appendChild(postsList)
  postsCol.appendChild(postsCard)

  // Feeds column
  const feedsCol = document.createElement('div')
  feedsCol.className = 'col-md-10 col-lg-4 mx-auto order-0 order-lg-1 feeds'

  const feedsCard = document.createElement('div')
  feedsCard.className = 'card border-0'

  const feedsCardBody = document.createElement('div')
  feedsCardBody.className = 'card-body'

  const feedsTitle = document.createElement('h2')
  feedsTitle.className = 'card-title h4'
  feedsTitle.textContent = i18next.t('feeds.header')

  feedsCardBody.appendChild(feedsTitle)

  const feedsList = document.createElement('ul')
  feedsList.className = 'list-group border-0 rounded-0'

  feeds.forEach((feed) => {
    const feedElement = createFeedElement(feed)
    feedsList.appendChild(feedElement)
  })

  feedsCard.appendChild(feedsCardBody)
  feedsCard.appendChild(feedsList)
  feedsCol.appendChild(feedsCard)

  row.appendChild(postsCol)
  row.appendChild(feedsCol)
  wrapper.appendChild(row)
  pageElements.main.appendChild(wrapper)

  pageElements.errField.textContent = i18next.t('loader.rssSuccess')
  pageElements.errField.classList.remove('text-danger')
  pageElements.errField.classList.add('text-success')
}

const createPostElement = (post, feedKey, visitedPosts, i18next) => {
  const li = document.createElement('li')
  li.className = 'list-group-item d-flex justify-content-between align-items-start border-0 border-end-0'

  const a = document.createElement('a')
  a.href = post.link
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.textContent = post.title
  a.className = visitedPosts.has(post.guid) ? 'fw-normal link-secondary' : 'fw-bold'
  a.dataset.id = post.guid

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn btn-outline-primary btn-sm'
  button.textContent = i18next.t('posts.button')
  button.dataset.feedId = feedKey
  button.dataset.id = post.guid
  button.setAttribute('data-bs-toggle', 'modal')
  button.setAttribute('data-bs-target', '#modal')

  li.appendChild(a)
  li.appendChild(button)

  return li
}

const createFeedElement = (feed) => {
  const li = document.createElement('li')
  li.className = 'list-group-item border-0 border-end-0'

  const h3 = document.createElement('h3')
  h3.className = 'h6 m-0'
  h3.textContent = feed.title

  const p = document.createElement('p')
  p.className = 'm-0 small text-black-50'
  p.textContent = feed.description

  li.appendChild(h3)
  li.appendChild(p)

  return li
}

const initModal = (i18next) => {
  const modal = document.createElement('div')
  modal.className = 'modal'
  modal.id = 'modal'
  modal.tabIndex = -1

  const modalDialog = document.createElement('div')
  modalDialog.className = 'modal-dialog'

  const modalContent = document.createElement('div')
  modalContent.className = 'modal-content'

  const modalHeader = document.createElement('div')
  modalHeader.className = 'modal-header'

  const modalTitle = document.createElement('h5')
  modalTitle.className = 'modal-title'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'btn-close'
  closeButton.setAttribute('data-bs-dismiss', 'modal')
  closeButton.setAttribute('aria-label', 'Close')

  modalHeader.appendChild(modalTitle)
  modalHeader.appendChild(closeButton)

  const modalBody = document.createElement('div')
  modalBody.className = 'modal-body'

  const modalFooter = document.createElement('div')
  modalFooter.className = 'modal-footer'

  const fullArticleLink = document.createElement('a')
  fullArticleLink.className = 'btn btn-primary full-article'
  fullArticleLink.setAttribute('href', '')
  fullArticleLink.setAttribute('role', 'button')
  fullArticleLink.setAttribute('target', '_blank')
  fullArticleLink.setAttribute('rel', 'noopener noreferrer')
  fullArticleLink.textContent = i18next.t('modal.read')

  const closeFooterButton = document.createElement('button')
  closeFooterButton.type = 'button'
  closeFooterButton.className = 'btn btn-secondary'
  closeFooterButton.setAttribute('data-bs-dismiss', 'modal')
  closeFooterButton.textContent = i18next.t('modal.close')

  modalFooter.appendChild(fullArticleLink)
  modalFooter.appendChild(closeFooterButton)

  modalContent.appendChild(modalHeader)
  modalContent.appendChild(modalBody)
  modalContent.appendChild(modalFooter)

  modalDialog.appendChild(modalContent)
  modal.appendChild(modalDialog)

  document.body.appendChild(modal)

  return modal
}

const markVisitedPosts = (visitedPostIDs) => {
  for (const postID of visitedPostIDs) {
    const post = document.querySelector(`.fw-bold[data-id="${postID}"]`)
    if (post) {
      post.classList.remove('fw-bold')
      post.classList.add('fw-normal', 'link-secondary')
    }
  }
}

export {
  initModal, watchState,
}
