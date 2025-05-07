import onChange from 'on-change';
import * as i18next from 'i18next';
import ruTranslation from './locales/ru.json';
import * as yup from 'yup';
import axios from 'axios';
import {initModal, renderForm, renderContent, markVisitedPosts} from './view.js';
import parseRss from './parser.js';
// import { validate } from 'webpack';

export default () => {
    i18next.init({
        lng: 'ru',
        debug: true,
        resources: {ru: {
            translation: ruTranslation
        }}
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
        BASE: "base",
        LOADING: "loading"
    };

    const loadingStates = {
        BASE: "base",
        LOADING: "loading",
        ERROR: "error"
    };

    const updatePeriod = 5000;

    const state = {
        form: {
            state: formStates.BASE,
            isValid: true,
            error: "",
        },
        loadingProcess: {
            status: "",
            error: "",
        },
        feeds: [],
        posts: {},
        ui: {
            visitedPosts: new Set()
        }
    };

    const watchedState = onChange(state, function (path, value, previousValue, applyData) {
        console.log('state', watchedState.posts);
        if(path.startsWith("form")) {
            renderForm(watchedState.form, pageElements, formStates);
        } else if(path === 'feeds' || path.startsWith("posts")) {
            renderContent(watchedState.feeds, watchedState.posts, watchedState.ui.visitedPosts, i18next, pageElements);
        } else if(path == 'ui.visitedPosts') {
            markVisitedPosts(watchedState.ui.visitedPosts);
        }
    });

    pageElements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        watchedState.form.state = formStates.LOADING;

        const url = pageElements.formInput.value.trim();
        
        const feedsUrls = watchedState.feeds.map((feed) => feed.url);

        validate(url, feedsUrls)
        .then(() => { //загружаем данные
            watchedState.form = { ...watchedState.form, isValid: true, error: ""};
            return getFeedData(url);
        })
        .then((feedData) => { //проверяем корректность
            return getRss(feedData);
        })
        .then((rawRss) => { //парсим
            return parseRss(rawRss) //пришлось обернуть в отдельный блок, чтобы перехватить ошибку из парсера и обработать её через i18n
            .then((parsedRss) => {
                return parsedRss;
            }).catch((err) => {
                err.message = i18next.t(err.message);
                throw err;
            });
        })
        .then((parsedRss) => { //записываем данные в state
            watchedState.form.state = formStates.BASE;
            watchedState.loadingProcess.status = loadingStates.BASE;

            const currentFeedID = getId();
            watchedState.posts[currentFeedID] = parsedRss.posts;
            watchedState.feeds.push({...parsedRss.feed, id: currentFeedID, url});

            //первый запуск автообновления
            setTimeout(() => {
                updateFeed(currentFeedID);
            }, updatePeriod);
        })
        .catch((err) => {
            watchedState.form = {isValid: false, error: err.message, state: formStates.BASE};
        })
        // .finally(() => {
        //     watchedState.form.state = formStates.BASE;
        //     watchedState.loadingProcess.status = loadingStates.BASE;
        // });
    });

    //валидируем адрес фида
    const validate = (str, urls) => {
        const rssFieldSchema = yup.string()
        .required()
        .url()
        .notOneOf(urls);
        
        return rssFieldSchema.validate(str);
    }

    // делаем запрос
    const getFeedData = (url) => {
        watchedState.loadingProcess.status = loadingStates.LOADING;

        const proxedUrl = prepareUrl(url);

        //загружаем содержимое
        return axios.get(proxedUrl)
            .then((response) => {
                return response; // возвращаем данные, чтобы использовать их потом
            })
            .catch((error) => {
                watchedState.loadingProcess.error = error.message;
                throw error; // пробрасываем ошибку выше
            });
    };

    //получаем проксированный адрес и добавляем параметр для избежания кеширования
    const prepareUrl = (url) => {
        return `https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}&t=${Date.now()}`;
    }

    //проверяем, что получен именно RSS и возвращаем именно тело
    const getRss = (feedData) => {
        return new Promise((resolve, reject) => {
          const contentType = feedData.data.status.content_type;
          if (contentType === "application/rss+xml; charset=utf-8") {
            resolve(feedData.data.contents); // всё ок — передаём дальше
          } else {
            reject(new Error(i18next.t('loader.invalidRss')));
          }
        });
    };

    let feedID = 0;
    const getId = () => {
        const idPrefix = 'feed';
        return `${idPrefix}${++feedID}`;
    }

    const updateFeed = (feedID) => {
        console.log('updateFeed', feedID);
        // получаем фид, интересует его URL
        const {url} = watchedState.feeds.find((feed) => feed.id === feedID);
        // загружаем содержимое
        getFeedData(url)
        .then((feedData) => { //проверяем корректность
            return getRss(feedData);
        })
        .then((rawRss) => { //парсим
            return parseRss(rawRss)
        })
        .then((parsedRss) => { //сравниваем и актуализируем посты
            if(parsedRss.posts) {
                // получаем массив постов из стейта
                // сравниваем массивы постов и получаем массив новых постов
                // добавляем массив новых постов к изначальному массиву постов
                const oldPostsGuids = new Set(watchedState.posts[feedID].map(item => item.guid));
                const addedPosts = parsedRss.posts.filter(item => !oldPostsGuids.has(item.guid));
                watchedState.posts[feedID] = [...watchedState.posts[feedID], ...addedPosts];
            }
            // запускаем эту функцию на таймере после успешной загрузки фида
            setTimeout(() => {
                updateFeed(feedID);
            }, updatePeriod);
        });
    }

    //при вызове модалки подменяем контент
    pageElements.modal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        const feedID = button.getAttribute('data-feed-id');
        const postID = button.getAttribute('data-id');
        
        const post = watchedState.posts[feedID].find((post) => post.guid === postID);

        pageElements.modal.querySelector('.modal-title').textContent = post.title;
        pageElements.modal.querySelector('.modal-body').textContent = post.description;

        pageElements.modal.querySelector('.btn-primary').href = post.link;

        watchedState.ui.visitedPosts.add(post.guid);
    });

    //при клике на ссылку помечаем её как прочитанную
    pageElements.main.addEventListener('click', function (event) {
        if (event.target.matches('.list-group-item>a')) {
            const post = event.target;
            const postID = post.getAttribute('data-id');
            if(postID) {
                watchedState.ui.visitedPosts.add(postID);
            }
        }
    });
}
