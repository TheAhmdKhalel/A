/* =========================================
   AHMAD KHALEL — CONTACT FORM
   Google Apps Script
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");

    if (!form) return;

    const submitButton = form.querySelector(".form-submit-button");
    const status = document.getElementById("form-status");

    const originalHTML = submitButton
        ? submitButton.innerHTML
        : "";

    /*
     * نفس Endpoint المستخدم في النماذج الخاصة.
     * ضع رابط Web App الخاص بك محليًا في form-config.js
     */
    const endpoint = String(
        window.AHMAD_FORMS_CONFIG?.endpoint || ""
    ).trim();

    const setStatus = (message, type = "") => {
        if (!status) return;

        status.hidden = false;
        status.textContent = message;

        if (type) {
            status.dataset.status = type;
        } else {
            status.removeAttribute("data-status");
        }
    };

    const clearStatus = () => {
        if (!status) return;

        status.hidden = true;
        status.textContent = "";
        status.removeAttribute("data-status");
    };

    const setButton = (html, disabled) => {
        if (!submitButton) return;

        submitButton.disabled = disabled;
        submitButton.innerHTML = html;
    };

    const getOptionText = (fieldName, fallback = "") => {
        const field = form.elements[fieldName];

        if (!(field instanceof HTMLSelectElement)) {
            return fallback;
        }

        return field.options[field.selectedIndex]?.text || fallback;
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearStatus();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!endpoint) {
            setStatus(
                "تعذر إرسال الطلب حاليًا. لم يتم إعداد الاتصال بالخادم.",
                "error"
            );
            return;
        }

        const name =
            form.elements.name?.value?.trim() || "";

        const email =
            form.elements.email?.value?.trim() || "";

        const countryCode =
            form.elements.whatsapp_country?.value?.trim() || "";

        const localNumber =
            form.elements.whatsapp_number?.value?.trim() || "";

        const message =
            form.elements.message?.value?.trim() || "";

        const service =
            getOptionText("service", "");


        const normalizedNumber =
            localNumber.replace(/[^0-9]/g, "");


        if (!countryCode || !normalizedNumber) {
            setStatus(
                "أدخل رقم واتساب صالحًا مع اختيار رمز الدولة.",
                "error"
            );
            return;
        }


        const phone =
            `${countryCode.replace("-CA", "")}${normalizedNumber}`;


        const botcheck =
            form.elements.botcheck?.checked === true;

        const payload = {
            action: "contact",
            name,
            email,
            phone,
            service,
            message,
            botcheck
        };


        try {

            setButton(
                'جاري الإرسال... <span aria-hidden="true">↗</span>',
                true
            );


            const response = await fetch(endpoint, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify(payload)
            });


            const result =
                await response.json().catch(() => ({}));


            if (!response.ok || result.ok !== true) {

                throw new Error(
                    result.error ||
                    `Request failed: ${response.status}`
                );
            }


            form.reset();


            setStatus(
                "تم إرسال طلبك بنجاح. شكرًا لك، وسأتواصل معك قريبًا.",
                "success"
            );


            setButton(
                'تم الإرسال <span aria-hidden="true">✓</span>',
                false
            );


            window.setTimeout(() => {

                setButton(
                    originalHTML,
                    false
                );

            }, 4000);


        } catch (error) {

            console.error(
                "Contact form submission failed:",
                error
            );


            setStatus(
                "تعذر إرسال الطلب حاليًا. حاول مرة أخرى أو تواصل معي عبر البريد الإلكتروني.",
                "error"
            );


            setButton(
                originalHTML,
                false
            );
        }
    });
});