import * as i18next from 'i18next'
import * as yup from 'yup'
import axios from 'axios'
import ruTranslation from './locales/ru.json'
import {
  initModal, watchState,
} from './view.js'
import parseRss from './parser.js'

const FORM_STATES = {
  BASE: 'base',
  LOADING: 'loading',
}

const LOADING_STATES = {
  BASE: 'base',
  LOADING: 'loading',
  ERROR: 'error',
}

const UPDATE_PERIOD = 5000

export default () => {
  i18next.init({
    lng: 'ru',
    debug: true,
    resources: {
      ru: {
        translation: ruTranslation,
      },
    },
  }).then(() => {
    yup.setLocale({
      mixed: {
        default: () => i18next.t('formErrors.default'),
        required: () => i18next.t('formErrors.required'),
        notOneOf: () => i18next.t('formErrors.duplicate'),
      },
      string: {
        url: () => i18next.t('formErrors.invalidUrl'),
      },
    })

    const pageElements = {
      form: document.querySelector('.rss-form'),
      formInput: document.querySelector('#url-input'),
      formBtn: document.querySelector('.rss-form button[type="submit"]'),
      errField: document.querySelector('.feedback'),
      main: document.querySelector('main'),
    }

    pageElements.modal = initModal(i18next)

    const state = {
      form: {
        state: FORM_STATES.BASE,
        isValid: true,
        error: '',
      },
      loadingProcess: {
        status: '',
        error: '',
      },
      feeds: [],
      posts: {},
      ui: {
        visitedPosts: new Set(),
      },
    }

    const watchedState = watchState(state, pageElements, i18next, FORM_STATES)
    console.log('watchedState', watchedState)

    // валидируем адрес фида
    const validate = (str, urls) => {
      const rssFieldSchema = yup.string()
        .required()
        .url()
        .notOneOf(urls)

      return rssFieldSchema.validate(str)
    }

    const loadRss = (parsedRss, url) => {
      watchedState.form.state = FORM_STATES.BASE
      watchedState.loadingProcess.status = LOADING_STATES.BASE

      const currentFeedID = getId()
      watchedState.posts[currentFeedID] = parsedRss.posts
      watchedState.feeds.push({ ...parsedRss.feed, id: currentFeedID, url })
    }

    pageElements.form.addEventListener('submit', (event) => {
      event.preventDefault()
      watchedState.form.state = FORM_STATES.LOADING

      const url = pageElements.formInput.value.trim()

      const feedsUrls = watchedState.feeds.map(feed => feed.url)

      validate(url, feedsUrls)
        .then(() => { // загружаем данные
          watchedState.form = { ...watchedState.form, isValid: true, error: '' }
          return getFeedData(url, watchedState, i18next)
        })
        .then(rawRss => // парсим
          parseRss(rawRss)
            .then(parsedRss => parsedRss).catch((err) => {
              // пришлось обернуть в отдельный блок,
              // чтобы перехватить ошибку из парсера и обработать её через i18n
              err.message = i18next.t(err.message)
              throw err
            }))
        .then(parsedRss => loadRss(parsedRss, url)) // записываем данные в state
        .catch((err) => {
          watchedState.form = { isValid: false, error: err.message, state: FORM_STATES.BASE }
        })
      // .finally(() => {
      //     watchedState.form.state = FORM_STATES.BASE;
      //     watchedState.loadingProcess.status = LOADING_STATES.BASE;
      // });
    })

    // при вызове модалки подменяем контент
    pageElements.modal.addEventListener('show.bs.modal', (event) => {
      const button = event.relatedTarget
      const cFeedID = button.getAttribute('data-feed-id')
      const postID = button.getAttribute('data-id')

      const post = watchedState.posts[cFeedID].find(cPost => cPost.guid === postID)

      pageElements.modal.querySelector('.modal-title').textContent = post.title
      pageElements.modal.querySelector('.modal-body').textContent = post.description

      pageElements.modal.querySelector('.btn-primary').href = post.link

      watchedState.ui.visitedPosts.add(post.guid)
    })

    // при клике на ссылку помечаем её как прочитанную
    pageElements.main.addEventListener('click', (event) => {
      if (event.target.matches('.list-group-item>a')) {
        const post = event.target
        const postID = post.getAttribute('data-id')
        if (postID) {
          watchedState.ui.visitedPosts.add(postID)
        }
      }
    })

    runAutoUpdate(watchedState)
  })
}

let feedID = 0
const getId = () => {
  const idPrefix = 'feed'
  return `${idPrefix}${++feedID}`
}

const prepareUrl = url => `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}&disableCache=true`

const getFeedData = (url, watchedState, i18next) => {
  watchedState.loadingProcess.status = LOADING_STATES.LOADING
  const proxedUrl = prepareUrl(url)
  return axios.get(proxedUrl)
    .then(response => response.data.contents)
    .catch((error) => {
      error.message = i18next.t('loader.networkError')
      watchedState.loadingProcess.error = error.message
      throw error
    })
}

const updateFeed = (feed, watchedState) => {
  const { id, url } = feed

  getFeedData(url, watchedState, i18next, LOADING_STATES)
    .then(raw => parseRss(raw))
    .then((parsed) => {
      const oldGuids = new Set(watchedState.posts[id].map(p => p.guid))
      const newPosts = parsed.posts.filter(p => !oldGuids.has(p.guid))
      watchedState.posts[id] = [...watchedState.posts[id], ...newPosts]
    })
    .catch((err) => {
      console.warn(`Фоновое обновление фида ${id} не удалось:`, err.message)
    })
}

const runAutoUpdate = (watchedState) => {
  const updateAllFeeds = () => {
    watchedState.feeds.forEach((feed) => {
      updateFeed(feed, watchedState)
    })
    setTimeout(updateAllFeeds, UPDATE_PERIOD)
  }

  updateAllFeeds()
}
