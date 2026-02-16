'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    HiTrash,
    HiNoSymbol,
    HiCheck,
    HiUser,
    HiMagnifyingGlass,
    HiEye,
    HiChevronUp,
    HiChevronDown,
    HiChevronLeft,
    HiChevronRight,
    HiGift,
    HiXMark,
} from 'react-icons/hi2';
import { useTranslations } from 'next-intl';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscription {
    status: string;
    endDate: string | null;
    isGifted: boolean;
}

interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    userMode: string;
    plan: string;
    isBanned: boolean;
    createdAt: string;
    propertyCount: number;
    listingCount: number;
    applicationCount: number;
    subscription: Subscription | null;
}

interface ApiResponse {
    users: UserRow[];
    total: number;
    page: number;
    totalPages: number;
}

interface UserManagementClientProps {
    currentUser: { id: string; role: string };
}

type SortField = 'name' | 'plan' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LIMIT = 25;

const UserManagementClient: React.FC<UserManagementClientProps> = ({ currentUser }) => {
    const router = useRouter();
    const t = useTranslations('admin.userManagement');
    const tAdmin = useTranslations('admin');

    // -----------------------------------------------------------------------
    // Filter state
    // -----------------------------------------------------------------------
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('');
    const [sortBy, setSortBy] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [page, setPage] = useState(1);

    // -----------------------------------------------------------------------
    // Data state
    // -----------------------------------------------------------------------
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // -----------------------------------------------------------------------
    // Debounce search
    // -----------------------------------------------------------------------
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300);
    };

    // -----------------------------------------------------------------------
    // Fetch users from API
    // -----------------------------------------------------------------------
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (planFilter) params.set('plan', planFilter);
            if (statusFilter) params.set('status', statusFilter);
            if (modeFilter) params.set('mode', modeFilter);
            params.set('sort', sortBy);
            params.set('order', sortOrder);
            params.set('page', String(page));
            params.set('limit', String(LIMIT));

            const res = await axios.get<ApiResponse>(`/api/admin/users?${params.toString()}`);
            setData(res.data);
        } catch {
            toast.error('Erreur lors du chargement des utilisateurs');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, planFilter, statusFilter, modeFilter, sortBy, sortOrder, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [planFilter, statusFilter, modeFilter]);

    // -----------------------------------------------------------------------
    // Sorting
    // -----------------------------------------------------------------------
    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) {
            return <HiChevronUp className="w-3 h-3 text-slate-300" />;
        }
        return sortOrder === 'asc' ? (
            <HiChevronUp className="w-3 h-3 text-slate-700" />
        ) : (
            <HiChevronDown className="w-3 h-3 text-slate-700" />
        );
    };

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    const onBan = async (id: string, currentlyBanned: boolean) => {
        if (!confirm(currentlyBanned ? t('confirmUnban') : t('confirmBan'))) return;
        setLoadingId(id);
        try {
            await axios.patch(`/api/admin/users/${id}`, { isBanned: !currentlyBanned });
            toast.success(currentlyBanned ? t('toastUnbanned') : t('toastBanned'));
            fetchUsers();
        } catch {
            toast.error(t('toastActionError'));
        } finally {
            setLoadingId(null);
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;
        setLoadingId(id);
        try {
            await axios.delete(`/api/admin/users/${id}`);
            toast.success(t('toastDeleted'));
            fetchUsers();
        } catch {
            toast.error(t('toastDeleteError'));
        } finally {
            setLoadingId(null);
        }
    };

    // -----------------------------------------------------------------------
    // Row click handler – navigate to user detail (skip if clicking actions)
    // -----------------------------------------------------------------------
    const handleRowClick = (userId: string, e: React.MouseEvent<HTMLTableRowElement>) => {
        const target = e.target as HTMLElement;
        // Don't navigate if user clicked on a button, link, or SVG icon inside actions
        if (target.closest('button') || target.closest('a')) return;
        router.push(`/admin/users/${userId}`);
    };

    // -----------------------------------------------------------------------
    // Reset all filters
    // -----------------------------------------------------------------------
    const hasActiveFilters = !!(planFilter || statusFilter || modeFilter || debouncedSearch);

    const resetFilters = () => {
        setPlanFilter('');
        setStatusFilter('');
        setModeFilter('');
        setSearch('');
        setDebouncedSearch('');
        setPage(1);
    };

    // -----------------------------------------------------------------------
    // Derived data
    // -----------------------------------------------------------------------
    const totalUsers = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    // -----------------------------------------------------------------------
    // Sub-components
    // -----------------------------------------------------------------------

    const PlanBadge = ({ plan }: { plan: string }) => {
        const styles: Record<string, string> = {
            FREE: 'bg-slate-100 text-slate-700',
            PLUS: 'bg-orange-100 text-orange-700',
            PRO: 'bg-slate-900 text-white',
        };
        return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${styles[plan] || styles.FREE}`}>
                {plan}
            </span>
        );
    };

    const SubscriptionBadge = ({ subscription }: { subscription: Subscription | null }) => {
        if (!subscription) {
            return (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-400">
                    Aucun
                </span>
            );
        }
        const statusStyles: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800',
            EXPIRED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-600',
            GIFTED: 'bg-purple-100 text-purple-800',
        };
        const displayStatus = subscription.isGifted ? 'GIFTED' : subscription.status;
        const style = statusStyles[displayStatus] || 'bg-slate-100 text-slate-600';
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${style}`}>
                {subscription.isGifted && <HiGift className="w-3 h-3" />}
                {displayStatus}
            </span>
        );
    };

    // -----------------------------------------------------------------------
    // Skeleton rows
    // -----------------------------------------------------------------------
    const SkeletonRow = ({ index }: { index: number }) => (
        <tr key={`skeleton-${index}`} className="animate-pulse">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="space-y-1.5">
                        <div className="h-3.5 w-28 bg-slate-200 rounded" />
                        <div className="h-3 w-36 bg-slate-100 rounded" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4"><div className="h-5 w-12 bg-slate-200 rounded-full" /></td>
            <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
            <td className="hidden md:table-cell px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
            <td className="hidden md:table-cell px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
            <td className="hidden md:table-cell px-6 py-4"><div className="h-4 w-8 bg-slate-200 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
            <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded" /></td>
        </tr>
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
                    {loading ? 'Utilisateurs' : t('title', { count: totalUsers })}
                </h2>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                    <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('search')}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-sm"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                {/* Plan filter */}
                <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                >
                    <option value="">Plan : Tous</option>
                    <option value="FREE">Free</option>
                    <option value="PLUS">Plus</option>
                    <option value="PRO">Pro</option>
                </select>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                >
                    <option value="">Statut : Tous</option>
                    <option value="active">Actifs</option>
                    <option value="banned">Bannis</option>
                </select>

                {/* Mode filter */}
                <select
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                >
                    <option value="">Mode : Tous</option>
                    <option value="TENANT">Locataire</option>
                    <option value="LANDLORD">Propri&eacute;taire</option>
                </select>

                {/* Reset filters */}
                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                        <HiXMark className="w-3.5 h-3.5" />
                        R&eacute;initialiser
                    </button>
                )}
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {/* Utilisateur */}
                                <th
                                    className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Utilisateur
                                        <SortIcon field="name" />
                                    </div>
                                </th>

                                {/* Plan */}
                                <th
                                    className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                    onClick={() => handleSort('plan')}
                                >
                                    <div className="flex items-center gap-1">
                                        Plan
                                        <SortIcon field="plan" />
                                    </div>
                                </th>

                                {/* Abonnement */}
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Abonnement
                                </th>

                                {/* Mode – hidden on mobile */}
                                <th className="hidden md:table-cell px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Mode
                                </th>

                                {/* Biens / Annonces – hidden on mobile */}
                                <th className="hidden md:table-cell px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Biens / Annonces
                                </th>

                                {/* Candidatures – hidden on mobile */}
                                <th className="hidden md:table-cell px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    Candidatures
                                </th>

                                {/* Inscrit le */}
                                <th
                                    className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    <div className="flex items-center gap-1">
                                        Inscrit le
                                        <SortIcon field="createdAt" />
                                    </div>
                                </th>

                                {/* Actions */}
                                <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <SkeletonRow key={`sk-${i}`} index={i} />
                                ))
                            ) : (
                                data?.users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-slate-50 transition cursor-pointer"
                                        onClick={(e) => handleRowClick(user.id, e)}
                                    >
                                        {/* Utilisateur: avatar + name + email */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                                                    {user.image ? (
                                                        <Image
                                                            src={user.image}
                                                            alt={user.name || 'User'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <HiUser className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 truncate">
                                                        {user.name || tAdmin('noName')}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Plan */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PlanBadge plan={user.plan} />
                                        </td>

                                        {/* Abonnement */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <SubscriptionBadge subscription={user.subscription} />
                                        </td>

                                        {/* Mode – hidden on mobile */}
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {user.userMode === 'TENANT' ? 'Locataire' : 'Propri\u00e9taire'}
                                        </td>

                                        {/* Biens / Annonces – hidden on mobile */}
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {user.propertyCount} biens &middot; {user.listingCount} annonces
                                        </td>

                                        {/* Candidatures – hidden on mobile */}
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {user.applicationCount}
                                        </td>

                                        {/* Inscrit le */}
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/admin/users/${user.id}`}
                                                    title="Voir"
                                                    className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
                                                >
                                                    <HiEye size={18} />
                                                </Link>

                                                {user.id !== currentUser.id && user.role !== 'ADMIN' && (
                                                    <>
                                                        <button
                                                            title={user.isBanned ? t('unban') : t('ban')}
                                                            onClick={() => onBan(user.id, user.isBanned)}
                                                            disabled={loadingId === user.id}
                                                            className={`p-2 rounded-full transition disabled:opacity-50 ${
                                                                user.isBanned
                                                                    ? 'text-green-600 hover:bg-green-50'
                                                                    : 'text-orange-600 hover:bg-orange-50'
                                                            }`}
                                                        >
                                                            {user.isBanned ? <HiCheck size={18} /> : <HiNoSymbol size={18} />}
                                                        </button>

                                                        <button
                                                            title={t('delete')}
                                                            onClick={() => onDelete(user.id)}
                                                            disabled={loadingId === user.id}
                                                            className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                                                        >
                                                            <HiTrash size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Empty state */}
                {!loading && data?.users.length === 0 && (
                    <div className="py-16 text-center text-slate-500">
                        Aucun utilisateur trouv&eacute;
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && data && totalPages > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        Page {page} sur {totalPages}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HiChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <HiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementClient;
