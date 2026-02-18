'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    FileText,
    CreditCard,
    Wrench,
    Euro,
} from 'lucide-react';
import { SafeListing } from '@/types';
import EditSectionFooter from './EditSectionFooter';
import CustomToast from '@/components/ui/CustomToast';

interface LeaseConditionsSectionProps {
    listing: SafeListing;
}

const LeaseConditionsSection: React.FC<LeaseConditionsSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // --- Jour de paiement ---
    const [paymentDay, setPaymentDay] = useState<number>((listing as any).paymentDay ?? 1);

    // --- Mode de paiement ---
    const [paymentMethod, setPaymentMethod] = useState<string>((listing as any).paymentMethod ?? 'VIREMENT');

    // --- Charges ---
    const [chargesAmount, setChargesAmount] = useState<number | ''>((listing as any).chargesAmount ?? '');
    const [chargesType, setChargesType] = useState<string>((listing as any).chargesType ?? '');

    // --- Travaux recents ---
    const recentWorksCents = (listing as any).recentWorksAmountCents ?? 0;
    const [recentWorksAmount, setRecentWorksAmount] = useState<number | ''>(
        recentWorksCents ? recentWorksCents / 100 : ''
    );
    const [recentWorksDescription, setRecentWorksDescription] = useState<string>(
        (listing as any).recentWorksDescription ?? ''
    );

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            await axios.put(`/api/listings/${listing.id}`, {
                paymentDay: paymentDay,
                paymentMethod: paymentMethod,
                chargesAmount: chargesAmount || null,
                chargesType: chargesType || null,
                recentWorksAmountCents: recentWorksAmount ? Math.round(Number(recentWorksAmount) * 100) : 0,
                recentWorksDescription: recentWorksDescription || 'Neant',
            });
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Conditions du bail mises a jour"
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            console.error('Failed to save lease conditions:', error);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la sauvegarde"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    }, [
        listing.id, router,
        paymentDay, paymentMethod,
        chargesAmount, chargesType,
        recentWorksAmount, recentWorksDescription,
    ]);

    const inputClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";
    const selectClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white appearance-none";
    const labelClass = "block text-sm font-medium text-neutral-700 mb-1";

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            {/* --- Paiement --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Modalites de paiement</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Jour de paiement du loyer</label>
                        <input
                            type="number"
                            min={1}
                            max={28}
                            value={paymentDay}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1 && val <= 28) {
                                    setPaymentDay(val);
                                } else if (e.target.value === '') {
                                    setPaymentDay(1);
                                }
                            }}
                            disabled={isLoading}
                            placeholder="1"
                            className={inputClass}
                        />
                        <p className="text-xs text-neutral-400 mt-1">Entre 1 et 28</p>
                    </div>
                    <div>
                        <label className={labelClass}>Mode de paiement</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={isLoading}
                            className={selectClass}
                        >
                            <option value="VIREMENT">Virement bancaire</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="PRELEVEMENT">Prelevement automatique</option>
                            <option value="ESPECES">Especes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- Charges --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Euro size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Charges locatives</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Montant des charges (EUR/mois)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min={0}
                                step="1"
                                value={chargesAmount}
                                onChange={(e) => setChargesAmount(e.target.value ? parseInt(e.target.value, 10) : '')}
                                disabled={isLoading}
                                placeholder="Ex: 150"
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Type de charges</label>
                        <select
                            value={chargesType}
                            onChange={(e) => setChargesType(e.target.value)}
                            disabled={isLoading}
                            className={selectClass}
                        >
                            <option value="">-- Selectionner --</option>
                            <option value="PROVISION">Provision sur charges (avec regularisation)</option>
                            <option value="FORFAIT">Forfait (charges fixes)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* --- Travaux recents --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Wrench size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Travaux recents</h3>
                </div>
                <p className="text-sm text-neutral-500">
                    Montant et nature des travaux effectues depuis la fin du dernier contrat ou les trois dernieres annees.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Montant des travaux (EUR)</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={recentWorksAmount}
                            onChange={(e) => setRecentWorksAmount(e.target.value ? parseFloat(e.target.value) : '')}
                            disabled={isLoading}
                            placeholder="0"
                            className={inputClass}
                        />
                        <p className="text-xs text-neutral-400 mt-1">Montant en euros (stocke en centimes)</p>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Description des travaux</label>
                    <textarea
                        value={recentWorksDescription}
                        onChange={(e) => setRecentWorksDescription(e.target.value)}
                        disabled={isLoading}
                        placeholder="Decrivez les travaux effectues ou indiquez &laquo; Neant &raquo;"
                        rows={3}
                        className={`${inputClass} resize-none`}
                    />
                </div>
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSave}
            />
        </div>
    );
};

export default LeaseConditionsSection;
