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
};

export {renderForm};