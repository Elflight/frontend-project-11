const renderForm = (formstate, pageElements, formStates) => {
    if(formstate.state == formStates.LOADING) {
        pageElements.formInput.disabled = true;
        pageElements.formBtn.disabled = true;
    } else {
        pageElements.formInput.disabled = false;
        pageElements.formBtn.disabled = false;
        if(formstate.isValid) {
            pageElements.formInput.value = "";
        }
        pageElements.formInput.focus();
    }

    if(!formstate.isValid) {
        pageElements.formInput.classList.add('is-invalid');
    } else {
        pageElements.formInput.classList.remove('is-invalid');
    }

    pageElements.errField.textContent = formstate.error ? formstate.error : "";
    pageElements.errField.classList.remove('text-success');
    pageElements.errField.classList.add('text-danger');
};

const renderContent = (feeds, posts, i18next, pageElements) => {
    const contentWrapper = document.querySelector('#contentWrapper');
    if(contentWrapper) {
        contentWrapper.remove();
    }

    let html = `<section class="container-fluid container-xxl p-5" id="contentWrapper">
        <div class="row">
            <div class="col-md-10 col-lg-8 order-1 mx-auto posts">
                <div class="card border-0">
                    <div class="card-body"><h2 class="card-title h4">${i18next.t("posts.header")}</h2></div>
                    <ul class="list-group border-0 rounded-0">`;
   
    Object.entries(posts).forEach(([feedKey, feedPosts]) => {
        feedPosts.forEach((feedPost, index) => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0">`;
            html += `<a href="${feedPost.link}" class="fw-bold" data-id="${feedKey}" target="_blank" rel="noopener noreferrer">${feedPost.title}</a>`;
            html += `<button type="button" class="btn btn-outline-primary btn-sm" data-id="${feedKey}" data-bs-toggle="modal" data-bs-target="#modal">${i18next.t("posts.button")}</button>`;
            html += `</li>`;
        });
    });
    html += `</ul></div></div>`;

    html += `<div class="col-md-10 col-lg-4 mx-auto order-0 order-lg-1 feeds">
                <div class="card border-0">
                    <div class="card-body"><h2 class="card-title h4">${i18next.t("feeds.header")}</h2></div>
                    <ul class="list-group border-0 rounded-0">`;
    feeds.forEach((objFeed) => {
        html += `<li class="list-group-item border-0 border-end-0">
                    <h3 class="h6 m-0">${objFeed.title}</h3>
                    <p class="m-0 small text-black-50">${objFeed.description}</p>
                </li>`;
    });
    html += `</ul></div></div>`;
    html += `</div></section>`;

    pageElements.main.insertAdjacentHTML('beforeend', html);

    pageElements.errField.textContent = i18next.t("loader.rssSuccess");
    pageElements.errField.classList.remove('text-danger');
    pageElements.errField.classList.add('text-success');
}

export {renderForm, renderContent};