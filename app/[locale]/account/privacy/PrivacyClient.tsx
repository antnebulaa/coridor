'use client';

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { Lock, Eye, Download, Trash2 } from "lucide-react";
import { SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";

interface PrivacyClientProps {
    currentUser?: SafeUser | null;
}

const PrivacyClient: React.FC<PrivacyClientProps> = ({ currentUser }) => {
    return (
        <Container>
            <div className="max-w-4xl mx-auto">
                <div className="mb-0">
                    <PageHeader
                        title="Confidentialité"
                        subtitle="Gérez vos données personnelles et vos préférences de confidentialité"
                    />
                </div>

                <div className="flex flex-col gap-8">
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
        </Container>
    );
}

export default PrivacyClient;
