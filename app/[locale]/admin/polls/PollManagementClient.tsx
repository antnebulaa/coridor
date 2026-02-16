'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, X, Archive, Trash2, Search, BarChart3 } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import Heading from '@/components/Heading';
import SoftInput from '@/components/inputs/SoftInput';
import { FieldValues, useForm, SubmitHandler } from 'react-hook-form';

interface SafePoll {
    id: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    option1: string;
    option2: string;
    option3: string;
    createdAt: string;
    closedAt: string | null;
    createdBy: { name: string | null; email: string | null };
    responseCount: number;
}

interface PollManagementClientProps {
    polls: SafePoll[];
}

const CATEGORY_LABELS: Record<string, string> = {
    NOISE_LEVEL: 'Bruit',
    SAFETY: 'Securite',
    TRANSPORT: 'Transports',
    SHOPPING: 'Commerces',
    SCHOOLS: 'Ecoles',
    PARKING: 'Stationnement',
    GREEN_SPACES: 'Espaces verts',
    COMMUNITY_SPIRIT: 'Vie de quartier',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

const STATUS_FILTERS = [
    { value: 'ALL', label: 'Tous' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'CLOSED', label: 'Ferme' },
    { value: 'ARCHIVED', label: 'Archive' },
];

const PollManagementClient: React.FC<PollManagementClientProps> = ({ polls }) => {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Create poll modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FieldValues>({
        defaultValues: {
            title: '',
            description: '',
            category: 'NOISE_LEVEL',
            option1: '',
            option2: '',
            option3: '',
        }
    });

    // Stats
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.status === 'ACTIVE').length;
    const totalResponses = polls.reduce((sum, p) => sum + p.responseCount, 0);

    // Filtered list
    const filteredPolls = useMemo(() => {
        return polls.filter(poll => {
            const matchesStatus = filterStatus === 'ALL' ? true : poll.status === filterStatus;
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query
                || poll.title.toLowerCase().includes(query);
            return matchesStatus && matchesSearch;
        });
    }, [polls, filterStatus, searchQuery]);

    // Actions
    const onClose = async (id: string) => {
        if (!window.confirm('Fermer ce sondage ? Les utilisateurs ne pourront plus y repondre.')) return;
        setLoadingId(id);
        try {
            await axios.patch(`/api/admin/polls/${id}`, { status: 'CLOSED' });
            toast.success('Sondage ferme avec succes');
            router.refresh();
        } catch (error) {
            toast.error('Erreur lors de la fermeture du sondage');
        } finally {
            setLoadingId(null);
        }
    };

    const onArchive = async (id: string) => {
        setLoadingId(id);
        try {
            await axios.patch(`/api/admin/polls/${id}`, { status: 'ARCHIVED' });
            toast.success('Sondage archive avec succes');
            router.refresh();
        } catch (error) {
            toast.error('Erreur lors de l\'archivage du sondage');
        } finally {
            setLoadingId(null);
        }
    };

    const onDelete = async (id: string) => {
        if (!window.confirm('Supprimer definitivement ce sondage et toutes ses reponses ?')) return;
        setLoadingId(id);
        try {
            await axios.delete(`/api/admin/polls/${id}`);
            toast.success('Sondage supprime avec succes');
            router.refresh();
        } catch (error) {
            toast.error('Erreur lors de la suppression du sondage');
        } finally {
            setLoadingId(null);
        }
    };

    const onCreateSubmit: SubmitHandler<FieldValues> = async (data) => {
        setLoadingId('create');
        try {
            await axios.post('/api/admin/polls', data);
            toast.success('Sondage cree avec succes');
            setIsCreateModalOpen(false);
            reset();
            router.refresh();
        } catch (error) {
            toast.error('Erreur lors de la creation du sondage');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">Gestion des sondages</h2>
                <button
                    onClick={() => {
                        reset();
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
                >
                    <Plus size={16} />
                    Nouveau sondage
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <BarChart3 size={20} className="text-slate-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalPolls}</div>
                        <div className="text-sm text-slate-500">Total sondages</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <BarChart3 size={20} className="text-green-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{activePolls}</div>
                        <div className="text-sm text-slate-500">Sondages actifs</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalResponses}</div>
                        <div className="text-sm text-slate-500">Total reponses</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par titre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    />
                </div>
                <div className="flex gap-1">
                    {STATUS_FILTERS.map(sf => (
                        <button
                            key={sf.value}
                            onClick={() => setFilterStatus(sf.value)}
                            className={`px-3 py-2 text-sm rounded-lg transition font-medium ${
                                filterStatus === sf.value
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {sf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Titre
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Categorie
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Options
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Reponses
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Date creation
                                </th>
                                <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                            {filteredPolls.map((poll) => (
                                <tr key={poll.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]" title={poll.title}>
                                            {poll.title}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {poll.createdBy.name || poll.createdBy.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                            {CATEGORY_LABELS[poll.category] || poll.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            <span className="inline-flex px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">{poll.option1}</span>
                                            <span className="inline-flex px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">{poll.option2}</span>
                                            <span className="inline-flex px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">{poll.option3}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <PollStatusBadge status={poll.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                        {poll.responseCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                        {new Date(poll.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            {poll.status === 'ACTIVE' && (
                                                <button
                                                    title="Fermer le sondage"
                                                    onClick={() => onClose(poll.id)}
                                                    disabled={loadingId === poll.id}
                                                    className="p-2 text-slate-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                            {(poll.status === 'ACTIVE' || poll.status === 'CLOSED') && (
                                                <button
                                                    title="Archiver le sondage"
                                                    onClick={() => onArchive(poll.id)}
                                                    disabled={loadingId === poll.id}
                                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition disabled:opacity-50"
                                                >
                                                    <Archive size={16} />
                                                </button>
                                            )}
                                            <button
                                                title="Supprimer le sondage"
                                                onClick={() => onDelete(poll.id)}
                                                disabled={loadingId === poll.id}
                                                className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredPolls.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic">
                        Aucun sondage trouve.
                    </div>
                )}
            </div>

            {/* Create Poll Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nouveau sondage"
                actionLabel="Creer"
                secondaryActionLabel="Annuler"
                secondaryAction={() => setIsCreateModalOpen(false)}
                onSubmit={handleSubmit(onCreateSubmit)}
                disabled={loadingId === 'create'}
                body={
                    <div className="flex flex-col gap-4">
                        <Heading
                            title="Creer un sondage"
                            subtitle="Definissez la question et les 3 options de reponse."
                        />
                        <SoftInput
                            id="title"
                            label="Question"
                            disabled={loadingId === 'create'}
                            register={register}
                            errors={errors}
                            required
                        />
                        <SoftInput
                            id="description"
                            label="Description (optionnel)"
                            disabled={loadingId === 'create'}
                            register={register}
                            errors={errors}
                        />
                        <div className="w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Categorie
                            </label>
                            <select
                                {...register('category', { required: true })}
                                disabled={loadingId === 'create'}
                                className="w-full px-3 py-3 border border-input rounded-xl text-sm outline-none focus:border-foreground transition bg-background"
                            >
                                {CATEGORY_OPTIONS.map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="border-t border-slate-200 pt-4">
                            <p className="text-sm font-medium text-slate-700 mb-3">Options de reponse</p>
                            <div className="flex flex-col gap-3">
                                <SoftInput
                                    id="option1"
                                    label="Option 1 (ex: Calme)"
                                    disabled={loadingId === 'create'}
                                    register={register}
                                    errors={errors}
                                    required
                                />
                                <SoftInput
                                    id="option2"
                                    label="Option 2 (ex: Moyen)"
                                    disabled={loadingId === 'create'}
                                    register={register}
                                    errors={errors}
                                    required
                                />
                                <SoftInput
                                    id="option3"
                                    label="Option 3 (ex: Bruyant)"
                                    disabled={loadingId === 'create'}
                                    register={register}
                                    errors={errors}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    );
};

const PollStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'ACTIVE':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Actif</div>;
        case 'CLOSED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Ferme</div>;
        case 'ARCHIVED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">Archive</div>;
        default:
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</div>;
    }
};

export default PollManagementClient;
