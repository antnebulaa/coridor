
import * as React from 'react';

interface EmailTemplateProps {
    previewText?: string;
    heading: string;
    children: React.ReactNode;
    actionLabel?: string;
    actionUrl?: string;
    footerCopyright?: string;
    footerDisclaimer?: string;
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
    previewText,
    heading,
    children,
    actionLabel,
    actionUrl,
    footerCopyright,
    footerDisclaimer
}) => (
    <div style={{
        backgroundColor: '#f6f9fc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
        padding: '40px 20px',
    }}>
        <div style={{
            backgroundColor: '#ffffff',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <img
                    src={`${process.env.NEXT_PUBLIC_APP_URL}/images/logo.png`}
                    alt="Coridor"
                    height="40"
                    style={{ margin: '0 auto' }}
                />
            </div>

            <h1 style={{
                color: '#1a1a1a',
                fontSize: '24px',
                fontWeight: '600',
                textAlign: 'center',
                margin: '0 0 24px',
            }}>
                {heading}
            </h1>

            <div style={{
                color: '#4a4a4a',
                fontSize: '16px',
                lineHeight: '24px',
                marginBottom: '32px',
            }}>
                {children}
            </div>

            {actionLabel && actionUrl && (
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <a
                        href={actionUrl}
                        style={{
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '50px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-block',
                        }}
                    >
                        {actionLabel}
                    </a>
                </div>
            )}

            <div style={{
                borderTop: '1px solid #e6e6e6',
                paddingTop: '24px',
                textAlign: 'center',
                color: '#888888',
                fontSize: '12px',
            }}>
                <p style={{ margin: 0 }}>{footerCopyright || `\u00a9 ${new Date().getFullYear()} Coridor. Tous droits r\u00e9serv\u00e9s.`}</p>
                <p style={{ margin: '8px 0 0' }}>
                    {footerDisclaimer || 'Vous recevez cet e-mail car vous \u00eates inscrit sur Coridor.'}
                </p>
            </div>
        </div>
    </div>
);
