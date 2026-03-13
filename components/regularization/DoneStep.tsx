'use client';

import { useTranslations, useLocale } from 'next-intl';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RegularizationDocument from '@/components/documents/RegularizationDocument';
import { Link } from '@/i18n/navigation';

interface DoneStepProps {
    previewData: any;
    tenantName: string;
    unitName: string;
    propertyAddress: string;
    year: number;
    leaseId: string;
    onClose: () => void;
}

const DoneStep: React.FC<DoneStepProps> = ({
    previewData,
    tenantName,
    unitName,
    propertyAddress,
    year,
    leaseId,
    onClose,
}) => {
    const t = useTranslations('regularization');
    const firstName = tenantName.split(' ')[0];

    return (
        <div className="flex flex-col h-full px-6 py-8">
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                {/* Green check — SVG, not emoji */}
                <div className="w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-500"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>

                <div>
                    <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white mb-2">
                        {t('done.title')}
                    </h2>
                    <p className="text-base text-neutral-500 dark:text-neutral-400">
                        {t('done.description', { name: firstName })}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
                {/* Download PDF */}
                <PDFDownloadLink
                    document={
                        <RegularizationDocument
                            data={previewData}
                            tenantName={tenantName}
                            unitName={unitName}
                            propertyAddress={propertyAddress}
                        />
                    }
                    fileName={`Decompte-Charges-${year}-${tenantName}.pdf`}
                    className="
                        w-full
                        bg-neutral-900 dark:bg-white
                        text-white dark:text-neutral-900
                        text-base font-medium
                        rounded-xl py-3 px-6
                        flex items-center justify-center
                        hover:opacity-90 transition
                    "
                >
                    {/* @ts-ignore - PDFDownloadLink children type mismatch */}
                    {({ loading }: { loading: boolean }) => (
                        loading ? t('done.generating') : t('done.downloadPdf')
                    )}
                </PDFDownloadLink>

                {/* View conversation link */}
                <button
                    onClick={onClose}
                    className="
                        w-full text-center text-sm
                        text-neutral-500 dark:text-neutral-400
                        hover:text-neutral-900 dark:hover:text-white
                        transition cursor-pointer py-2
                    "
                >
                    {t('done.close')}
                </button>
            </div>
        </div>
    );
};

export default DoneStep;
