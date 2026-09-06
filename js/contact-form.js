/* =========================================
   AHMAD KHALEL — PUBLIC CONTACT FORM
   Google Sheets + Web3Forms email
   ========================================= */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const submitButton = form.querySelector(".form-submit-button");
    const status = document.getElementById("form-status");
    const originalHTML = submitButton ? submitButton.innerHTML : "";
    const cfg = window.AHMAD_FORMS_CONFIG || {};
    const endpoint = String(cfg.endpoint || "").trim();
    const web3AccessKey = String(cfg.web3AccessKey || "").trim();

    const setStatus = (message, type = "") => {
        if (!status) return;
        status.hidden = false;
        status.textContent = message;
        if (type) status.dataset.status = type;
        else status.removeAttribute("data-status");
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
        return field instanceof HTMLSelectElement
            ? field.options[field.selectedIndex]?.text || fallback
            : fallback;
    };

    const postToSheets = async (payload) => {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const raw = await response.text();
        let result = {};
        try { result = JSON.parse(raw); } catch (_) {}

        if (!response.ok) throw new Error(`SHEETS_${response.status}`);
        if (result.ok === false) throw new Error(result.error || "SHEETS_REJECTED");
        return result;
    };

    const sendWeb3Email = async (payload) => {
        if (!web3AccessKey) throw new Error("fae80777-5bb6-4044-beb2-d2f0d09874c3");

        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                access_key: web3AccessKey,
                subject: "طلب مشروع جديد — Ahmad Khalel",
                from_name: "Ahmad Khalel Contact Form",
                name: payload.name,
                email: payload.email,
                replyto: payload.email,
                message: [
                    "وصل طلب جديد من موقع Ahmad Khalel.",
                    "",
                    `الاسم: ${payload.name}`,
                    `البريد الإلكتروني: ${payload.email}`,
                    `واتساب: ${payload.phone}`,
                    `الخدمة: ${payload.service}`,
                    "",
                    "تفاصيل المشروع:",
                    payload.message
                ].join("\n")
            })
        });

        const raw = await response.text();
        let result = {};
        try { result = JSON.parse(raw); } catch (_) {}

        if (!response.ok || result.success !== true) {
            throw new Error(result.message || "WEB3_EMAIL_FAILED");
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

        if (!endpoint || !web3AccessKey) {
            setStatus("تعذر إرسال الطلب حاليًا. إعدادات الإرسال غير مكتملة.", "error");
            return;
        }

        const name = form.elements.name?.value?.trim() || "";
        const email = form.elements.email?.value?.trim() || "";
        const countryCode = form.elements.whatsapp_country?.value?.trim() || "";
        const localNumber = form.elements.whatsapp_number?.value?.trim() || "";
        const message = form.elements.message?.value?.trim() || "";
        const service = getOptionText("service", "");
        const normalizedNumber = localNumber.replace(/[^0-9]/g, "");

        if (!countryCode || !normalizedNumber) {
            setStatus("أدخل رقم واتساب صالحًا مع اختيار رمز الدولة.", "error");
            return;
        }

        const payload = {
            action: "contact",
            name,
            email,
            phone: `${countryCode.replace("-CA", "")}${normalizedNumber}`,
            service,
            message,
            botcheck: form.elements.botcheck?.checked === true
        };

        try {
            setButton('جاري الإرسال... <span aria-hidden="true">↗</span>', true);

            // First persist the request in Google Sheets.
            await postToSheets(payload);

            // Then send the email notification through Web3Forms.
            try {
                await sendWeb3Email(payload);
            } catch (emailError) {
                console.error("Web3Forms email failed after Sheets save:", emailError);
                setStatus(
                    "تم حفظ طلبك بنجاح، لكن تعذر إرسال إشعار البريد الآن. سأراجعه من السجل.",
                    "success"
                );
                form.reset();
                setButton(originalHTML, false);
                return;
            }

            form.reset();
            setStatus(
                "تم إرسال طلبك بنجاح. شكرًا لك، وسأتواصل معك قريبًا.",
                "success"
            );

            setButton('تم الإرسال <span aria-hidden="true">✓</span>', false);
            window.setTimeout(() => setButton(originalHTML, false), 4000);

        } catch (error) {
            console.error("Contact form submission failed:", error);
            setStatus(
                "تعذر حفظ الطلب حاليًا. حاول مرة أخرى أو تواصل معي عبر البريد الإلكتروني.",
                "error"
            );
            setButton(originalHTML, false);
        }
    });
});
