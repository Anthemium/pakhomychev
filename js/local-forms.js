/* Форма остаётся в браузере: сервера для заявок нет. */
(function () {
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.classList || !form.classList.contains("js-lead")) return;
    e.preventDefault();

    var name = form.querySelector("[name='name']");
    var contact = form.querySelector("[name='contact']");
    var error = form.querySelector(".form-error");
    var success = form.querySelector(".form-success");
    var fields = form.querySelector(".form-fields");
    var nameOk = name && String(name.value || "").trim();
    var contactOk = contact && String(contact.value || "").trim();

    if (error) error.hidden = !!(nameOk && contactOk);
    if (!nameOk || !contactOk) return;
    if (fields) fields.hidden = true;
    if (success) success.hidden = false;
  }, true);
})();
