import onChange from 'on-change';
import * as i18next from 'i18next';
import ruTranslation from './locales/ru.json';
import * as yup from 'yup';
import axios from 'axios';
import {renderForm, renderContent} from './view.js';
import parseRss from './parser.js';

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

    const formStates = {
        BASE: "base",
        LOADING: "loading"
    };

    const loadingStates = {
        BASE: "base",
        LOADING: "loading"
    };

    let feedID = 0;

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
        posts: {}
    };

    const watchedState = onChange(state, function (path, value, previousValue, applyData) {
        if(path.startsWith("form")) {
            renderForm(watchedState.form, pageElements, formStates);
        } else if(path === 'feeds') {
            renderContent(watchedState.feeds, watchedState.posts, i18next, pageElements);
        }
    });

    pageElements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        watchedState.form.state = formStates.LOADING;

        const url = pageElements.formInput.value.trim();

        const test = watchedState.feeds.map((feed) => feed.url);
        console.log(watchedState.feeds);
        console.log('test', test);
        console.log('url', url);
        
        const rssFieldSchema = yup.string()
        .required()
        .url()
        .notOneOf(watchedState.feeds.map((feed) => feed.url));

        rssFieldSchema.validate(url) //валидируем адрес
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

            const currentFeedID = ++feedID;
            watchedState.posts['feed'+currentFeedID] = parsedRss.posts;
            watchedState.feeds.push({...parsedRss.feed, id: currentFeedID, url});
            // console.log(watchedState);
        })
        .catch((err) => {
            watchedState.form = { ...watchedState.form, isValid: false, error: err.message, state: formStates.BASE};
        })
        // .finally(() => {
        //     watchedState.form.state = formStates.BASE;
        //     watchedState.loadingProcess.status = loadingStates.BASE;
        // });
    });

    //получаем проксированный адрес и делаем запрос
    const getFeedData = (url) => {
        watchedState.loadingProcess.status = loadingStates.LOADING;

        const proxedUrl =`https://allorigins.hexlet.app/get?url=${encodeURIComponent(url)}`;

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
}
