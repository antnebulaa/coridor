'use client';

import { useEffect, useState } from "react";
import Modal from "./Modal";
import useLeaseModal from "@/hooks/useLeaseModal";
import { generateLeaseHtml } from "@/utils/leaseGenerator";
import { SafeUser } from "@/types";
import { Button } from "../ui/Button";

interface LeaseModalProps {
    currentUser?: SafeUser | null;
}

const LeaseModal: React.FC<LeaseModalProps> = ({
    currentUser
}) => {
    const leaseModal = useLeaseModal();
    const [leaseHtml, setLeaseHtml] = useState('');

    useEffect(() => {
        if (leaseModal.reservation && currentUser) {
            const html = generateLeaseHtml(leaseModal.reservation, currentUser);
            setLeaseHtml(html);
        }
    }, [leaseModal.reservation, currentUser]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(leaseHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    const bodyContent = (
        <div className="h-[60vh] w-full border rounded-md overflow-hidden">
            <iframe
                srcDoc={leaseHtml}
                className="w-full h-full"
                title="Lease Preview"
            />
        </div>
    );

    const footerContent = (
        <div className="flex flex-col gap-4 mt-3">
            <hr />
            <Button
                label="Print / Download PDF"
                onClick={handlePrint}
            />
        </div>
    );

    return (
        <Modal
            isOpen={leaseModal.isOpen}
            onClose={leaseModal.onClose}
            onSubmit={handlePrint}
            title="Lease Agreement Preview"
            actionLabel="Print"
            body={bodyContent}
            footer={footerContent}
            disabled={!leaseModal.reservation}
        />
    );
}

export default LeaseModal;
