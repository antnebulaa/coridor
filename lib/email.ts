
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');

// Update to support React elements or raw HTML
import { ReactNode } from 'react';

export const sendEmail = async (to: string, subject: string, content: string | ReactNode) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Email not sent.");
        return;
    }

    try {
        const payload: any = {
            from: 'Coridor <onboarding@resend.dev>',
            to,
            subject,
        };

        if (typeof content === 'string') {
            payload.html = content;
        } else {
            payload.react = content;
        }

        const data = await resend.emails.send(payload);
        return data;
    } catch (error) {
        console.error("Email sending failed:", error);
    }
};
