'use client';

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { signOut } from "next-auth/react";
import { Shield } from "lucide-react";

interface SecurityClientProps {
    currentUser?: any;
}

const SecurityClient: React.FC<SecurityClientProps> = ({ currentUser }) => {
    return (
        <Container>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Heading
                        title="Connexion et sécurité"
                        subtitle="Gérez vos paramètres de sécurité et votre connexion."
                    />
                </div>

                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4 p-6 border border-gray-200 rounded-xl bg-white">
                        <div className="flex items-center gap-4 text-neutral-800">
                            <Shield size={24} />
                            <h3 className="text-xl font-semibold">Sécurité</h3>
                        </div>
                        <p className="text-neutral-500">
                            Pour votre sécurité, nous vous recommandons de vous déconnecter si vous utilisez un ordinateur partagé.
                        </p>
                        <div className="w-full md:w-auto mt-4">
                            <Button
                                label="Se déconnecter"
                                onClick={() => signOut()}
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default SecurityClient;
