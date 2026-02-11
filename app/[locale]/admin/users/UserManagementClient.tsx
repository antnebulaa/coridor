'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import Image from 'next/image';
import { HiTrash, HiNoSymbol, HiCheck, HiUser, HiMagnifyingGlass } from 'react-icons/hi2';
import { useTranslations } from 'next-intl';

interface UserManagementClientProps {
    // eslint-disable-next-line
    users: any[];
    // eslint-disable-next-line
    currentUser: any;
}

const UserManagementClient: React.FC<UserManagementClientProps> = ({ users, currentUser }) => {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const t = useTranslations('admin.userManagement');
    const tAdmin = useTranslations('admin');

    const filteredUsers = users.filter((user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const onBan = async (id: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? t('confirmUnban') : t('confirmBan'))) return;

        setLoadingId(id);
        try {
            await axios.patch(`/api/admin/users/${id}`, { isBanned: !currentStatus });
            toast.success(currentStatus ? t('toastUnbanned') : t('toastBanned'));
            router.refresh();
        } catch {
            toast.error(t('toastActionError'));
        } finally {
            setLoadingId(null);
        }
    }

    const onDelete = async (id: string) => {
        if (!confirm(t('confirmDelete'))) return;

        setLoadingId(id);
        try {
            await axios.delete(`/api/admin/users/${id}`);
            toast.success(t('toastDeleted'));
            router.refresh();
        } catch {
            toast.error(t('toastDeleteError'));
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('title', { count: users.length })}</h2>

                <div className="relative">
                    <HiMagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('search')}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                {t('colUser')}
                            </th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                {t('colRole')}
                            </th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                {t('colStatus')}
                            </th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                {t('colRegistration')}
                            </th>
                            <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">
                                {t('colActions')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative">
                                            {user.image ? (
                                                <Image src={user.image} alt={user.name || 'User'} fill className="object-cover" />
                                            ) : (
                                                <HiUser className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">
                                                {user.name || tAdmin('noName')}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full w-fit ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {user.role}
                                        </span>
                                        <span className="text-xs text-slate-500 capitalize">
                                            {user.userMode.toLowerCase()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.isBanned ? (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                            {t('banned')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            {t('active')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {user.id !== currentUser.id && user.role !== 'ADMIN' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                title={user.isBanned ? t('unban') : t('ban')}
                                                onClick={() => onBan(user.id, user.isBanned)}
                                                disabled={loadingId === user.id}
                                                className={`p-2 rounded-full transition disabled:opacity-50 ${user.isBanned ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
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
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic">
                        {t('noResults')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagementClient;
