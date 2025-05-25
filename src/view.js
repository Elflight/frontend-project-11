const renderForm = (formstate, pageElements, formStates) => {
  if (formstate.state === formStates.LOADING) {
    pageElements.formInput.disabled = true
    pageElements.formBtn.disabled = true
  } else {
    pageElements.formInput.disabled = false
    pageElements.formBtn.disabled = false
    if (formstate.isValid) {
      pageElements.formInput.value = ''
    }
    pageElements.formInput.focus()
  }

  if (!formstate.isValid) {
    pageElements.formInput.classList.add('is-invalid')
  } else {
    pageElements.formInput.classList.remove('is-invalid')
  }

  pageElements.errField.textContent = formstate.error ? formstate.error : ''
  pageElements.errField.classList.remove('text-success')
  pageElements.errField.classList.add('text-danger')
}

const renderContent = (watchedState, i18next, pageElements) => {
  const { posts } = watchedState
  const { feeds } = watchedState
  const visitedPostIDs = watchedState.ui.visitedPosts
  const contentWrapper = document.querySelector('#contentWrapper')
  if (contentWrapper) {
    contentWrapper.remove()
  }

  let html = `<section class="container-fluid container-xxl p-5" id="contentWrapper">
        <div class="row">
            <div class="col-md-10 col-lg-8 order-1 mx-auto posts">
                <div class="card border-0">
                    <div class="card-body"><h2 class="card-title h4">${i18next.t('posts.header')}</h2></div>
                    <ul class="list-group border-0 rounded-0">`

  Object.entries(posts).forEach(([feedKey, feedPosts]) => {
    feedPosts.forEach((feedPost) => {
      let linkClass = 'fw-bold'
      if (visitedPostIDs.has(feedPost.guid)) {
        linkClass = 'fw-normal link-secondary'
      }
      html += '<li class="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0">'
      html += `<a href="${feedPost.link}" class="${linkClass}" data-id="${feedPost.guid}" target="_blank" rel="noopener noreferrer">${feedPost.title}</a>`
      html += `<button type="button" class="btn btn-outline-primary btn-sm" data-feed-id="${feedKey}"  data-id="${feedPost.guid}" data-bs-toggle="modal" data-bs-target="#modal">${i18next.t('posts.button')}</button>`
      html += '</li>'
    })
  })
  html += '</ul></div></div>'

  html += `<div class="col-md-10 col-lg-4 mx-auto order-0 order-lg-1 feeds">
                <div class="card border-0">
                    <div class="card-body"><h2 class="card-title h4">${i18next.t('feeds.header')}</h2></div>
                    <ul class="list-group border-0 rounded-0">`
  feeds.forEach((objFeed) => {
    html += `<li class="list-group-item border-0 border-end-0">
                    <h3 class="h6 m-0">${objFeed.title}</h3>
                    <p class="m-0 small text-black-50">${objFeed.description}</p>
                </li>`
  })
  html += '</ul></div></div>'
  html += '</div></section>'

  pageElements.main.insertAdjacentHTML('beforeend', html)

  pageElements.errField.textContent = i18next.t('loader.rssSuccess')
  pageElements.errField.classList.remove('text-danger')
  pageElements.errField.classList.add('text-success')
}

const initModal = (i18next) => {
  const modal = `<div class="modal" id="modal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <a class="btn btn-primary full-article" href="" role="button" target="_blank" rel="noopener noreferrer">${i18next.t('modal.read')}</a>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18next.t('modal.close')}</button>
            </div>
          </div>
        </div>
    </div>`
  document.querySelector('body').insertAdjacentHTML('beforeend', modal)

  return document.querySelector('#modal')
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
  initModal, renderForm, renderContent, markVisitedPosts,
}
