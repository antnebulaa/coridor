'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';

interface QuickAddExpenseProps {
    properties: { id: string; title: string }[];
    isOpen: boolean;
    onClose: () => void;
    onExpenseAdded: () => void;
}

const CATEGORIES = [
    { value: 'COLD_WATER', label: 'Eau froide' },
    { value: 'HOT_WATER', label: 'Eau chaude' },
    { value: 'ELECTRICITY_COMMON', label: 'Électricité (commun)' },
    { value: 'ELECTRICITY_PRIVATE', label: 'Électricité (privé)' },
    { value: 'HEATING_COLLECTIVE', label: 'Chauffage collectif' },
    { value: 'TAX_PROPERTY', label: 'Taxe foncière' },
    { value: 'ELEVATOR', label: 'Ascenseur' },
    { value: 'INSURANCE', label: 'Assurance' },
    { value: 'MAINTENANCE', label: 'Entretien / Réparations' },
    { value: 'CARETAKER', label: 'Gardiennage' },
    { value: 'GENERAL_CHARGES', label: 'Charges générales' },
    { value: 'BUILDING_CHARGES', label: 'Charges copropriété' },
    { value: 'PARKING', label: 'Parking' },
    { value: 'INSURANCE_GLI', label: 'Assurance GLI' },
    { value: 'OTHER', label: 'Autre' },
];

const QuickAddExpense: React.FC<QuickAddExpenseProps> = ({
    properties, isOpen, onClose, onExpenseAdded,
}) => {
    const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
    const [category, setCategory] = useState('MAINTENANCE');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [isRecoverable, setIsRecoverable] = useState(false);
    const [recoverableRatio, setRecoverableRatio] = useState(100);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!propertyId || !category || !amount || !date) return;

        setSubmitting(true);
        try {
            await axios.post(`/api/properties/${propertyId}/expenses`, {
                category,
                label: description || CATEGORIES.find(c => c.value === category)?.label || category,
                amountTotalCents: Math.round(parseFloat(amount) * 100),
                dateOccurred: date,
                frequency: 'ONCE',
                isRecoverable,
                recoverableRatio: isRecoverable ? recoverableRatio / 100 : 0,
            });

            toast.custom((t) => (
                <CustomToast t={t} message="Dépense ajoutée" type="success" />
            ));

            // Reset form
            setAmount('');
            setDescription('');
            setIsRecoverable(false);
            setRecoverableRatio(100);

            onExpenseAdded();
            onClose();
        } catch {
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de l'ajout" type="error" />
            ));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40"
                onClick={onClose}
            />

            {/* Sheet/Modal */}
            <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full z-50">
                <div className="bg-white dark:bg-neutral-900 rounded-t-2xl md:rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl max-h-[85vh] overflow-y-auto">
                    {/* Handle (mobile) */}
                    <div className="flex justify-center pt-3 md:hidden">
                        <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    </div>

                    <div className="p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                Ajouter une dépense
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                            >
                                <X size={20} className="text-neutral-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Property */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Bien *
                                </label>
                                <select
                                    value={propertyId}
                                    onChange={e => setPropertyId(e.target.value)}
                                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                >
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Catégorie *
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Montant (€) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white tabular-nums"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Description (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Ex : Réparation fuite SdB"
                                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                />
                            </div>

                            {/* Recoverable */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="recoverable"
                                    checked={isRecoverable}
                                    onChange={e => setIsRecoverable(e.target.checked)}
                                    className="rounded border-neutral-300"
                                />
                                <label htmlFor="recoverable" className="text-sm text-neutral-700 dark:text-neutral-300">
                                    Récupérable sur le locataire
                                </label>
                            </div>

                            {isRecoverable && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        Ratio récupérable (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={recoverableRatio}
                                        onChange={e => setRecoverableRatio(parseInt(e.target.value) || 0)}
                                        className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6 pb-safe">
                            <button
                                onClick={onClose}
                                className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !propertyId || !category || !amount}
                                className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition disabled:opacity-50"
                            >
                                {submitting ? 'Ajout...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default QuickAddExpense;
