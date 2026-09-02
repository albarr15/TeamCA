import emailjs from "@emailjs/browser";
import { toast } from "@/components/starwind/toast";

const SERVICE_ID = "service_k2pet9c";
const TEMPLATE_ID = "template_vm7ibkx";
const PUBLIC_KEY = "uSXW7KLOY_xnbZdEt";

emailjs.init({ publicKey: PUBLIC_KEY });

function setupContactForm() {

    const form = document.querySelector(
        "#contact-form-02",
    ) as HTMLFormElement | null;

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        // Build template params from all named fields
        const templateParams: Record<string, string> = {};
        for (const [key, value] of formData.entries()) {
            if (key !== "services-of-interest") {
                templateParams[key] = value as string;
            }
        }

        // Join all checked services into a comma-separated string
        templateParams["services-of-interest"] = formData
            .getAll("services-of-interest")
            .join(", ");

        try {
            const response = await emailjs.send(
                SERVICE_ID,
                TEMPLATE_ID,
                templateParams,
            );
            console.log("Email sent successfully:", response.status, response.text, templateParams);
            toast.success("Success!", { description: "Your consultation request has been sent. We will get back to you as soon as possible." });
            form.reset();
        } catch (error) {
            console.error("Failed to send email:", error);
            toast.error("Error!", { description: "Failed to send consultation request. Please try again later." });
        }
    });
}

setupContactForm();
document.addEventListener("astro:after-swap", setupContactForm);