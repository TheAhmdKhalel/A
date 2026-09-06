/* =========================================
   AHMAD KHALEL — CONTACT FORM
   Google Apps Script + Google Sheets
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");

    if (!form) return;

    const submitButton = form.querySelector(".form-submit-button");
    const status = document.getElementById("form-status");
    const originalHTML = submitButton ? submitButton.innerHTML : "";

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

    const postToGoogleSheets = async (payload) => {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        /*
         * Apps Script Web Apps can pass through a redirect.
         * Read text first so a valid submission is not reported as
         * a false error merely because the final response is not JSON.
         */
        const raw = await response.text();

        let result = null;

        try {
            result = JSON.parse(raw);
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(
                `Request failed: ${response.status}`
            );
        }

        /*
         * A valid Apps Script JSON response must confirm ok:true.
         * If Google processed the request but returned a non-JSON body,
         * keep the transport result successful rather than inventing
         * a client-side failure.
         */
        if (result && result.ok === false) {
            throw new Error(
                result.error || "Server rejected the request."
            );
        }

        return result;
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

            await postToGoogleSheets(payload);

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
                setButton(originalHTML, false);
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

            setButton(originalHTML, false);
        }
    });
});
