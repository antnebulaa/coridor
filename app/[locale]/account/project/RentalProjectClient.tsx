'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import SoftSelect from "@/components/inputs/SoftSelect";
import SoftInput from "@/components/inputs/SoftInput";
import Heading from "@/components/Heading";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import Counter from "@/components/inputs/Counter";
import { useTranslations } from 'next-intl';

import { CompositionType, CoupleLegalStatus, TargetLeaseType } from "@prisma/client";

interface RentalProjectClientProps {
    existingScope?: {
        compositionType: CompositionType;
        membersIds: string[];
        coupleLegalStatus?: CoupleLegalStatus | null;
        targetLeaseType: TargetLeaseType;
        targetMoveInDate?: string | null;
        childCount: number;
    } | null;
}

const RentalProjectClient: React.FC<RentalProjectClientProps> = ({ existingScope }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('account.project');
    const tEnums = useTranslations('account.enums');

    // State as strings for SoftSelect compatibility
    const [compositionType, setCompositionType] = useState<string>(existingScope?.compositionType || '');
    const [coupleLegalStatus, setCoupleLegalStatus] = useState<string>(existingScope?.coupleLegalStatus || '');
    const [targetLeaseType, setTargetLeaseType] = useState<string>(existingScope?.targetLeaseType || '');
    const [targetMoveInDate, setTargetMoveInDate] = useState<string>(
        existingScope?.targetMoveInDate ? existingScope.targetMoveInDate.split('T')[0] : ''
    );
    const [childCount, setChildCount] = useState(existingScope?.childCount || 0);

    const onSubmit = () => {
        setIsLoading(true);

        axios.post('/api/account/project', {
            compositionType,
            coupleLegalStatus: compositionType === 'COUPLE' ? coupleLegalStatus : null,
            targetLeaseType,
            targetMoveInDate,
            childCount
        })
            .then(() => {
                toast.success(t('toasts.success'));
                router.refresh();
            })
            .catch(() => {
                toast.error(t('toasts.error'));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const compositionOptions = [
        { value: 'SOLO', label: tEnums('composition.SOLO') },
        { value: 'COUPLE', label: tEnums('composition.COUPLE') },
        { value: 'GROUP', label: tEnums('composition.GROUP') }
    ];

    const statusOptions = [
        { value: 'NONE', label: tEnums('status.NONE') },
        { value: 'MARRIED', label: tEnums('status.MARRIED') },
        { value: 'PACS', label: tEnums('status.PACS') },
        { value: 'CONCUBINAGE', label: tEnums('status.CONCUBINAGE') }
    ];

    const leaseOptions = [
        { value: 'ANY', label: tEnums('lease.ANY') },
        { value: 'FURNISHED', label: tEnums('lease.FURNISHED') },
        { value: 'EMPTY', label: tEnums('lease.EMPTY') },
        { value: 'MOBILITY', label: tEnums('lease.MOBILITY') }
    ];

    return (
        <Container>
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col">
                    <PageHeader
                        title={t('title')}
                        subtitle={t('subtitle')}
                    />

                    <div className="flex flex-col gap-4">
                        <SoftSelect
                            id="compositionType"
                            label={t('composition.label')}
                            options={compositionOptions}
                            value={compositionType}
                            onChange={(e) => setCompositionType(e.target.value)}
                            disabled={isLoading}
                        />

                        {compositionType === 'COUPLE' && (
                            <SoftSelect
                                id="coupleLegalStatus"
                                label={t('status.label')}
                                options={statusOptions}
                                value={coupleLegalStatus}
                                onChange={(e) => setCoupleLegalStatus(e.target.value)}
                                disabled={isLoading}
                            />
                        )}

                        <SoftSelect
                            id="targetLeaseType"
                            label={t('lease.label')}
                            options={leaseOptions}
                            value={targetLeaseType}
                            onChange={(e) => setTargetLeaseType(e.target.value)}
                            disabled={isLoading}
                        />

                        <SoftInput
                            id="targetMoveInDate"
                            label={t('moveInDate.label')}
                            type="date"
                            disabled={isLoading}
                            value={targetMoveInDate}
                            onChange={(e) => setTargetMoveInDate(e.target.value)}
                            className="appearance-none min-h-[56px]! h-[56px]! max-h-[56px]!"
                        />

                        <hr />

                        <Counter
                            title={t('children.title')}
                            subtitle={t('children.subtitle')}
                            value={childCount}
                            onChange={(value) => setChildCount(value)}
                            min={0}
                        />
                    </div>

                    <div className="mt-4">
                        <div
                            onClick={onSubmit}
                            className="
                                p-3 
                                bg-primary 
                                text-white 
                                rounded-lg 
                                text-center 
                                cursor-pointer 
                                hover:bg-primary-hover 
                                transition 
                                font-medium
                            "
                        >
                            {isLoading ? t('saving') : t('save')}
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default RentalProjectClient;
