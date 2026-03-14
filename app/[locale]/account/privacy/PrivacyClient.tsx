'use client';

import PageHeader from "@/components/PageHeader";
import { Lock, Eye, Download, Trash2, Activity, Server } from "lucide-react";
import { SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";

interface PrivacyClientProps {
    currentUser?: SafeUser | null;
}

const PrivacyClient: React.FC<PrivacyClientProps> = ({ currentUser }) => {
    return (
        <div className="pb-10">
                <PageHeader
                    title="Confidentialité"
                    subtitle="Gérez vos données personnelles et vos préférences de confidentialité"
                />

                <div className="mt-10 flex flex-col gap-8">
                    {/* Data visibility */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Eye size={24} />
                            <h3 className="text-xl font-semibold">Visibilité du profil</h3>
                        </div>
                        <p className="text-neutral-500">
                            Votre profil est visible uniquement par les propriétaires des annonces auxquelles vous candidatez.
                            Vos informations personnelles ne sont jamais partagées publiquement.
                        </p>
                    </div>

                    {/* Technical monitoring */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Activity size={24} />
                            <h3 className="text-xl font-semibold">Monitoring technique</h3>
                        </div>
                        <p className="text-neutral-500">
                            Coridor utilise Sentry, un service de monitoring d&apos;erreurs, afin de
                            détecter et corriger rapidement les problèmes techniques qui pourraient
                            affecter votre expérience.
                        </p>

                        <div className="flex flex-col gap-3">
                            <p className="font-medium text-foreground">Données collectées en cas d&apos;erreur :</p>
                            <ul className="list-disc list-inside space-y-1 text-neutral-500">
                                <li>L&apos;URL de la page où l&apos;erreur s&apos;est produite</li>
                                <li>Le type de navigateur et d&apos;appareil utilisé</li>
                                <li>La trace technique de l&apos;erreur</li>
                                <li>Votre identifiant utilisateur</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <p className="font-medium text-foreground">Données NON collectées :</p>
                            <ul className="list-disc list-inside space-y-1 text-neutral-500">
                                <li>Vos mots de passe</li>
                                <li>Vos documents personnels (bail, EDL, pièces justificatives)</li>
                                <li>Le contenu de vos messages</li>
                                <li>Vos informations bancaires</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-2 text-neutral-500">
                            <p><span className="font-medium text-foreground">Base légale :</span> Intérêt légitime (article 6.1.f du RGPD)</p>
                            <p><span className="font-medium text-foreground">Conservation :</span> 90 jours</p>
                            <p><span className="font-medium text-foreground">Transfert :</span> États-Unis, encadré par les clauses contractuelles types (SCC)</p>
                        </div>
                    </div>

                    {/* Data processors */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Server size={24} />
                            <h3 className="text-xl font-semibold">Sous-traitants</h3>
                        </div>
                        <p className="text-neutral-500">
                            Coridor fait appel aux sous-traitants suivants pour le fonctionnement du service.
                            Les transferts vers les États-Unis sont encadrés par les clauses contractuelles types (SCC).
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 pr-4 font-medium text-foreground">Sous-traitant</th>
                                        <th className="text-left py-3 pr-4 font-medium text-foreground">Finalité</th>
                                        <th className="text-left py-3 font-medium text-foreground">Pays</th>
                                    </tr>
                                </thead>
                                <tbody className="text-neutral-500">
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Vercel</td>
                                        <td className="py-3 pr-4">Hébergement</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Supabase</td>
                                        <td className="py-3 pr-4">Base de données</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Cloudinary</td>
                                        <td className="py-3 pr-4">Stockage images</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Resend</td>
                                        <td className="py-3 pr-4">Emails transactionnels</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Sentry</td>
                                        <td className="py-3 pr-4">Monitoring d&apos;erreurs</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">YouSign</td>
                                        <td className="py-3 pr-4">Signature électronique</td>
                                        <td className="py-3">France</td>
                                    </tr>
                                    <tr className="border-b border-border">
                                        <td className="py-3 pr-4">Powens</td>
                                        <td className="py-3 pr-4">Connexion bancaire</td>
                                        <td className="py-3">France</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4">Stripe</td>
                                        <td className="py-3 pr-4">Paiements</td>
                                        <td className="py-3">États-Unis</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Data export */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Download size={24} />
                            <h3 className="text-xl font-semibold">Exporter mes données</h3>
                        </div>
                        <p className="text-neutral-500">
                            Conformément au RGPD, vous pouvez demander une copie de toutes vos données personnelles
                            stockées sur Coridor.
                        </p>
                        <div className="w-full md:w-auto mt-2">
                            <Button
                                label="Demander un export"
                                onClick={() => window.location.href = 'mailto:contact@coridor.fr?subject=Demande%20export%20données'}
                                variant="outline"
                            />
                        </div>
                    </div>

                    {/* Account deletion */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Trash2 size={24} />
                            <h3 className="text-xl font-semibold">Supprimer mon compte</h3>
                        </div>
                        <p className="text-neutral-500">
                            La suppression de votre compte est définitive. Toutes vos données, candidatures et
                            messages seront supprimés de manière irréversible.
                        </p>
                        <div className="w-full md:w-auto mt-2">
                            <Button
                                label="Demander la suppression"
                                onClick={() => window.location.href = 'mailto:contact@coridor.fr?subject=Demande%20suppression%20compte'}
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            />
                        </div>
                    </div>
                </div>
        </div>
    );
}

export default PrivacyClient;
