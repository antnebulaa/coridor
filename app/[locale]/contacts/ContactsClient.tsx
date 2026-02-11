'use client';

import { SafeUser } from "@/types";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import Avatar from "@/components/Avatar";
import AddContactModal from "@/components/modals/AddContactModal";
import useMyCodeModal from "@/hooks/useMyCodeModal";
import SoftInput from "@/components/inputs/SoftInput";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";

interface ContactsClientProps {
    contacts: SafeUser[];
    currentUser?: SafeUser | null;
    addContactCode?: string;
}

const ContactsClient: React.FC<ContactsClientProps> = ({
    contacts,
    currentUser,
    addContactCode
}) => {
    const router = useRouter();
    const myCodeModal = useMyCodeModal();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [inputCode, setInputCode] = useState("");

    const handleValidateCode = () => {
        if (inputCode) {
            router.push(`/contacts?code=${inputCode}`);
        }
    };

    useEffect(() => {
        if (addContactCode) {
            setIsAddModalOpen(true);
        }
    }, [addContactCode]);

    const onCloseModal = () => {
        setIsAddModalOpen(false);
        router.replace('/contacts');
    }



    return (
        <Container>
            <AddContactModal
                code={addContactCode || null}
                isOpen={isAddModalOpen}
                onClose={onCloseModal}
            />
            {contacts.length === 0 ? (
                <div
                    className="
                        h-[60vh]
                        flex 
                        flex-col 
                        gap-2 
                        justify-center 
                        items-center 
                    "
                >
                    <Heading
                        center
                        title="Aucun contact"
                        subtitle="Vous n'avez pas encore ajouté de contacts."
                    />
                    <div className="w-full max-w-[300px] flex flex-col gap-4 mt-8">
                        {showInput ? (
                            <div className="flex flex-col gap-4 w-full animate-in fade-in zoom-in duration-300">
                                <SoftInput
                                    id="code"
                                    label="Code du contact"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    disabled={false}
                                />
                                <div className="flex flex-row gap-4">
                                    <Button
                                        label="Annuler"
                                        onClick={() => setShowInput(false)}
                                        variant="outline"
                                        className="rounded-full"
                                    />
                                    <Button
                                        label="Valider"
                                        onClick={handleValidateCode}
                                        disabled={!inputCode || inputCode.length < 3}
                                        className="rounded-full"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <Button
                                    label="Ajouter un contact"
                                    onClick={() => setShowInput(true)}
                                    className="rounded-full"
                                />
                                <Button
                                    label="Partager mon contact"
                                    onClick={myCodeModal.onOpen}
                                    variant="outline"
                                    className="rounded-full"
                                />
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <Heading
                        title="Mes Contacts"
                        subtitle="Liste de vos contacts enregistrés"
                    />
                    <div
                        className="
                            mt-10
                            grid 
                            grid-cols-1 
                            sm:grid-cols-2 
                            md:grid-cols-3 
                            lg:grid-cols-4
                            xl:grid-cols-5
                            2xl:grid-cols-6
                            gap-8
                        "
                    >
                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className="col-span-1 cursor-pointer group"
                            >
                                <div className="flex flex-col gap-2 w-full">
                                    <div
                                        className="
                                            aspect-square 
                                            w-full 
                                            relative 
                                            overflow-hidden 
                                            rounded-xl
                                            bg-neutral-100
                                            dark:bg-neutral-800
                                            flex
                                            items-center
                                            justify-center
                                        "
                                    >
                                        <div className="scale-150 transform transition group-hover:scale-175">
                                            <Avatar src={contact.image} />
                                        </div>
                                    </div>
                                    <div className="font-semibold text-lg">
                                        {contact.name}
                                    </div>
                                    <div className="font-light text-neutral-500">
                                        {contact.email}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Container>
    );
};

export default ContactsClient;
