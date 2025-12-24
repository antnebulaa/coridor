import axios from 'axios';

const YOUSIGN_API_URL = process.env.YOUSIGN_API_URL || "https://api-sandbox.yousign.app/v3";
const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;

interface Signer {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string; // E.164 format
}

export class YousignService {

    private static get headers() {
        if (!YOUSIGN_API_KEY) {
            throw new Error("YOUSIGN_API_KEY is not defined");
        }
        return {
            'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Complete Flow: Create Request -> Upload PDF -> Add Signers -> Activate
     */
    static async initiateSignatureRequest(
        name: string,
        pdfBuffer: Buffer,
        signers: Signer[]
    ): Promise<string> {

        if (!YOUSIGN_API_KEY) throw new Error("YOUSIGN_API_KEY is missing");

        try {
            // 1. Create Signature Request
            console.log("[Yousign] 1. Creating Request:", name);
            const initRes = await axios.post(
                `${YOUSIGN_API_URL}/signature_requests`,
                {
                    name: name,
                    delivery_mode: "email",
                    timezone: "Europe/Paris"
                },
                { headers: this.headers }
            );
            const signatureRequestId = initRes.data.id;

            // 2. Upload Document via Fetch (for correct Multipart Boundary)
            console.log("[Yousign] 2. Uploading PDF...");
            const formData = new FormData();
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            formData.append('file', blob, 'Bail_Location.pdf');
            formData.append('nature', 'signable_document');
            formData.append('parse_anchors', 'true');

            const uploadRes = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${YOUSIGN_API_KEY}`
                },
                body: formData
            });

            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error(`Upload failed: ${errText}`);
            }
            const docData = await uploadRes.json();
            const documentId = docData.id;

            // 3. Add Signers
            console.log("[Yousign] 3. Adding Signers...");
            for (const signer of signers) {
                await axios.post(
                    `${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/signers`,
                    {
                        info: {
                            first_name: signer.first_name,
                            last_name: signer.last_name,
                            email: signer.email,
                            phone_number: signer.phone_number,
                            locale: "fr"
                        },
                        // Default to Page 1 signature if anchors fail, but we hope for anchors later.
                        fields: [
                            {
                                document_id: documentId,
                                type: "signature",
                                page: 1,
                                x: 100, // Arbitrary placement if anchors miss
                                y: 100
                            }
                        ],
                        signature_level: "electronic_signature",
                        signature_authentication_mode: "otp_sms"
                    },
                    { headers: this.headers }
                );
            }

            // 4. Activate
            console.log("[Yousign] 4. Activating...");
            await axios.post(
                `${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/activate`,
                {},
                { headers: this.headers }
            );

            return signatureRequestId;

        } catch (error: any) {
            console.error("Yousign API Error:", error.response?.data || error.message);
            throw error;
        }
    }
}
