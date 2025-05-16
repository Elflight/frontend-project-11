/* eslint-disable import/extensions */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
import onChange from 'on-change';
import * as i18next from 'i18next';
import * as yup from 'yup';
import axios from 'axios';
import ruTranslation from './locales/ru.json';
import {
  initModal, renderForm, renderContent, markVisitedPosts,
} from './view.js';
import parseRss from './parser.js';

export default () => {
  i18next.init({
    lng: 'ru',
    debug: true,
    resources: {
      ru: {
        translation: ruTranslation,
      },
    },
  });

  yup.setLocale({
    mixed: {
      default: () => i18next.t('formErrors.default'),
      required: () => i18next.t('formErrors.required'),
      notOneOf: () => i18next.t('formErrors.duplicate'),
    },
    string: {
      url: () => i18next.t('formErrors.invalidUrl'),
    },
  });

  const pageElements = {
    form: document.querySelector('.rss-form'),
    formInput: document.querySelector('#url-input'),
    formBtn: document.querySelector('.rss-form button[type="submit"]'),
    errField: document.querySelector('.feedback'),
    main: document.querySelector('main'),
  };

  pageElements.modal = initModal(i18next);

  const formStates = {
    BASE: 'base',
    LOADING: 'loading',
  };

  const loadingStates = {
    BASE: 'base',
    LOADING: 'loading',
    ERROR: 'error',
  };

  const updatePeriod = 5000;

  const state = {
    form: {
      state: formStates.BASE,
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
  };

  const watchedState = onChange(state, (path) => {
    console.log('state', watchedState.posts);
    if (path.startsWith('form')) {
      renderForm(watchedState.form, pageElements, formStates);
    } else if (path === 'feeds' || path.startsWith('posts')) {
      renderContent(watchedState, i18next, pageElements);
    } else if (path === 'ui.visitedPosts') {
      markVisitedPosts(watchedState.ui.visitedPosts);
    }
  });

  // валидируем адрес фида
  const validate = (str, urls) => {
    const rssFieldSchema = yup.string()
      .required()
      .url()
      .notOneOf(urls);

    return rssFieldSchema.validate(str);
  };

  // получаем проксированный адрес и добавляем параметр для избежания кеширования
  const prepareUrl = (url) => `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}&disableCache=true`;

  // делаем запрос
  const getFeedData = (url) => {
    watchedState.loadingProcess.status = loadingStates.LOADING;

    const proxedUrl = prepareUrl(url);

    // загружаем содержимое
    return axios.get(proxedUrl)
      .then((response) => response.data.contents) // возвращаем данные, чтобы использовать их потом
      .catch((error) => {
        error.message = i18next.t('loader.networkError');
        watchedState.loadingProcess.error = error.message;
        throw error; // пробрасываем ошибку выше
      });
  };

  const updateFeed = (updFeedID) => {
    console.log('updateFeed', updFeedID);
    // получаем фид, интересует его URL
    const { url } = watchedState.feeds.find((feed) => feed.id === updFeedID);
    // загружаем содержимое
    getFeedData(url)
      .then((rawRss) => parseRss(rawRss)) // парсим
      .then((parsedRss) => { // сравниваем и актуализируем посты
        if (parsedRss.posts) {
          // получаем массив постов из стейта
          // сравниваем массивы постов и получаем массив новых постов
          // добавляем массив новых постов к изначальному массиву постов
          const oldPostsGuids = new Set(watchedState.posts[updFeedID].map((item) => item.guid));
          const addedPosts = parsedRss.posts.filter((item) => !oldPostsGuids.has(item.guid));
          watchedState.posts[updFeedID] = [...watchedState.posts[updFeedID], ...addedPosts];
        }
        // запускаем эту функцию на таймере после успешной загрузки фида
        setTimeout(() => {
          updateFeed(updFeedID);
        }, updatePeriod);
      });
  };

  let feedID = 0;
  const getId = () => {
    const idPrefix = 'feed';
    return `${idPrefix}${++feedID}`;
  };

  pageElements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    watchedState.form.state = formStates.LOADING;

    const url = pageElements.formInput.value.trim();

    const feedsUrls = watchedState.feeds.map((feed) => feed.url);

    validate(url, feedsUrls)
      .then(() => { // загружаем данные
        watchedState.form = { ...watchedState.form, isValid: true, error: '' };
        return getFeedData(url);
      })
      .then((rawRss) => // парсим
        parseRss(rawRss)
          .then((parsedRss) => parsedRss).catch((err) => {
            // пришлось обернуть в отдельный блок,
            // чтобы перехватить ошибку из парсера и обработать её через i18n
            err.message = i18next.t(err.message);
            throw err;
          }))
      .then((parsedRss) => { // записываем данные в state
        watchedState.form.state = formStates.BASE;
        watchedState.loadingProcess.status = loadingStates.BASE;

        const currentFeedID = getId();
        watchedState.posts[currentFeedID] = parsedRss.posts;
        watchedState.feeds.push({ ...parsedRss.feed, id: currentFeedID, url });

        // первый запуск автообновления
        setTimeout(() => {
          updateFeed(currentFeedID);
        }, updatePeriod);
      })
      .catch((err) => {
        watchedState.form = { isValid: false, error: err.message, state: formStates.BASE };
      });
    // .finally(() => {
    //     watchedState.form.state = formStates.BASE;
    //     watchedState.loadingProcess.status = loadingStates.BASE;
    // });
  });

  // при вызове модалки подменяем контент
  pageElements.modal.addEventListener('show.bs.modal', (event) => {
    const button = event.relatedTarget;
    const cFeedID = button.getAttribute('data-feed-id');
    const postID = button.getAttribute('data-id');

    const post = watchedState.posts[cFeedID].find((cPost) => cPost.guid === postID);

    pageElements.modal.querySelector('.modal-title').textContent = post.title;
    pageElements.modal.querySelector('.modal-body').textContent = post.description;

    pageElements.modal.querySelector('.btn-primary').href = post.link;

    watchedState.ui.visitedPosts.add(post.guid);
  });

  // при клике на ссылку помечаем её как прочитанную
  pageElements.main.addEventListener('click', (event) => {
    if (event.target.matches('.list-group-item>a')) {
      const post = event.target;
      const postID = post.getAttribute('data-id');
      if (postID) {
        watchedState.ui.visitedPosts.add(postID);
      }
    }
  });
};
