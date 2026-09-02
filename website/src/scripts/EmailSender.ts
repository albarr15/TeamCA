import emailjs from "@emailjs/browser";
import { toast } from "@/components/starwind/toast";

const SERVICE_ID = "service_k2pet9c";
const TEMPLATE_ID = "template_vm7ibkx";
const PUBLIC_KEY = "uSXW7KLOY_xnbZdEt";

emailjs.init({ publicKey: PUBLIC_KEY });

type Row = { label: string; value: string; optional?: boolean };

function buildRow({ label, value, optional }: Row): string {
    const optionalTag = optional
        ? ` <span style="font-style: italic; color: #999">(optional)</span>`
        : "";
    return `
      <tr>
        <td style="padding: 6px 0; width: 40%; vertical-align: top; color: #666">${label}${optionalTag}</td>
        <td style="padding: 6px 0; vertical-align: top">${value || "&mdash;"}</td>
      </tr>`;
}

function setupContactForm() {
    const form = document.querySelector(
        "#contact-form-02",
    ) as HTMLFormElement | null;

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const get = (key: string) => (formData.get(key) as string) ?? "";

        const bookingType = get("booking-type"); // "Individual" | "Organization"
        const servicesOfInterest = formData
            .getAll("services-of-interest")
            .join(", ");

        // Shared fields, always present
        const rows: Row[] = [
            { label: "Full Name", value: get("name") },
            { label: "Email Address", value: get("email") },
            { label: "Phone Number", value: get("phone-number") },
            { label: "Booking As", value: bookingType },
        ];

        if (bookingType === "Individual") {
            rows.push(
                { label: "Age", value: get("age"), optional: true },
                { label: "Life Stage", value: get("life-stage"), optional: true }
            );
        } else if (bookingType === "Organization") {
            rows.push({ label: "Company Name", value: get("company-name") });

            const position = get("position");
            rows.push(
                { label: "Position", value: position, optional: true },
            );

            if (position === "Other (please specify)") {
                rows.push({
                    label: "Other Position",
                    value: get("other-position"),
                });
            }
        }

        rows.push(
            {
                label: "Services of Interest",
                value: servicesOfInterest,
                optional: true,
            }
        );

        if (bookingType === "Individual") {
            rows.push(
                {
                    label: "Message",
                    value: get("message-indiv"),
                    optional: true,
                },

            );
        } else if (bookingType === "Organization") {
            rows.push(
                {
                    label: "Message",
                    value: get("message-org"),
                    optional: true,
                },
            );
        }

        const detailsTable = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0">${rows
            .map(buildRow)
            .join("")}</table>`;

        const templateParams = {
            name: get("name"),
            email: get("email"),
            "details-table": detailsTable,
        };

        try {
            const response = await emailjs.send(
                SERVICE_ID,
                TEMPLATE_ID,
                templateParams,
            );
            toast.success("Success!", { description: "Your consultation request has been sent. We will get back to you as soon as possible." });
            form.reset();

            // form.reset() doesn't fire starwind:value-change, so manually
            // restore the default "Individual" view
            const individualWrapper = document.getElementById("individual-wrapper") as HTMLFieldSetElement | null;
            const organizationWrapper = document.getElementById("organization-wrapper") as HTMLFieldSetElement | null;
            if (individualWrapper) {
                individualWrapper.classList.remove("hidden");
                individualWrapper.disabled = false;
            }
            if (organizationWrapper) {
                organizationWrapper.classList.add("hidden");
                organizationWrapper.disabled = true;
            }
        } catch (error) {
            console.error("Failed to send email:", error);
            toast.error("Error!", { description: "Failed to send consultation request. Please try again later." });
        }
    });
}

setupContactForm();
document.addEventListener("astro:after-swap", setupContactForm);