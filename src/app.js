import onChange from 'on-change';
import * as i18next from 'i18next';
import ruTranslation from './locales/ru.json';
import * as yup from 'yup';
import {renderForm} from './view.js';

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
          default: () => i18next.t('errors.default'),
          required: () => i18next.t('errors.required'),
          notOneOf: () => i18next.t('errors.duplicate'),
        },
        string: {
          url: () => i18next.t('errors.invalidUrl'),
        },
    });

    const pageElements = {
        form: document.querySelector('.rss-form'),
        formInput: document.querySelector('#url-input'),
        formBtn: document.querySelector('.rss-form button[type="submit"]'),
        errField: document.querySelector('.feedback'),
    };

    const formStates = {
        BASE: "base",
        LOADING: "loading"
    };

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
        feeds: [
        ]
    }; 

    const watchedState = onChange(state, function (path, value, previousValue, applyData) {
        if(path.startsWith("form")) {
            renderForm(watchedState.form, pageElements, formStates);
        }
    });

    pageElements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        watchedState.form.state = formStates.LOADING;

        const val = pageElements.formInput.value;
        
        const rssFieldSchema = yup.string().trim().required().url().notOneOf(watchedState.feeds.map((feed) => feed.url));
        rssFieldSchema.validate(val)
        .then(() => {
            watchedState.form = { ...watchedState.form, isValid: true, error: ""};
            getFeedData(val)
            .then(() => {
                console.log(watchedState);
                watchedState.form.state = formStates.BASE;
            });
        })
        .catch((err) => {
            Object.assign(watchedState.form, {})
            watchedState.form = { ...watchedState.form, isValid: false, error: err.message, state: formStates.BASE};
        });
    });

    const getFeedData = (val, ms=5000) => new Promise(resolve => {
        watchedState.feeds.push({name: "test", url: val});
        setTimeout(resolve, ms);
    });
}
