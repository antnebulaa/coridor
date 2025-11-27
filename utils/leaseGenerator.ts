import { SafeListing, SafeReservation, SafeUser } from "@/types";
import { format } from "date-fns";

export const generateLeaseHtml = (reservation: SafeReservation, landlord: SafeUser) => {
    const tenant = reservation.user;
    const listing = reservation.listing;

    const startDate = format(new Date(reservation.startDate), 'dd/MM/yyyy');
    const endDate = format(new Date(reservation.endDate), 'dd/MM/yyyy');
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    // Basic French Lease Template (Mobilité/Student simplified)
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 30px; text-transform: uppercase; }
            h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .section { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; }
            .signature-box { height: 100px; border: 1px solid #ccc; margin-top: 10px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .party { width: 45%; }
        </style>
    </head>
    <body>
        <h1>CONTRAT DE LOCATION</h1>
        
        <div class="section">
            <p><strong>Date de rédaction :</strong> ${currentDate}</p>
        </div>

        <div class="section">
            <h2>1. LES PARTIES</h2>
            
            <p><strong>LE BAILLEUR (Propriétaire) :</strong></p>
            <p>Nom/Prénom : ${landlord.name || 'N/A'}</p>
            <p>Adresse : ${landlord.address || 'N/A'}</p>
            <p>Email : ${landlord.email}</p>
            
            <br/>
            
            <p><strong>LE LOCATAIRE :</strong></p>
            <p>Nom/Prénom : ${tenant.name || 'N/A'}</p>
            <p>Email : ${tenant.email}</p>
            <p>Téléphone : ${tenant.phoneNumber || 'N/A'}</p>
        </div>

        <div class="section">
            <h2>2. OBJET DU CONTRAT</h2>
            <p>Le Bailleur donne en location au Locataire le logement suivant :</p>
            <p><strong>Adresse du logement :</strong> ${listing.locationValue} (Région/Pays - Adresse complète à préciser)</p>
            <p><strong>Type :</strong> ${listing.category}</p>
            <p><strong>Description :</strong> ${listing.description}</p>
            <p><strong>Nombre de pièces :</strong> ${listing.roomCount}</p>
            <p><strong>Surface :</strong> (Non précisé)</p>
        </div>

        <div class="section">
            <h2>3. DURÉE DU CONTRAT</h2>
            <p>Le présent contrat est conclu pour une durée déterminée.</p>
            <p><strong>Date de prise d'effet :</strong> ${startDate}</p>
            <p><strong>Date de fin :</strong> ${endDate}</p>
        </div>

        <div class="section">
            <h2>4. CONDITIONS FINANCIÈRES</h2>
            <p><strong>Loyer mensuel :</strong> ${listing.price} €</p>
            <p><strong>Charges forfaitaires :</strong> ${(listing.charges as any)?.amount || 0} €</p>
            <p><strong>Total mensuel :</strong> ${listing.price + ((listing.charges as any)?.amount || 0)} €</p>
            <p><strong>Dépôt de garantie :</strong> (Non précisé)</p>
        </div>

        <div class="section">
            <h2>5. SIGNATURES</h2>
            <p>Fait à ____________________, le ${currentDate}, en deux exemplaires originaux.</p>
            
            <div class="signatures">
                <div class="party">
                    <p><strong>Le Bailleur</strong></p>
                    <p>(Signature précédée de "Lu et approuvé")</p>
                    <div class="signature-box"></div>
                </div>
                <div class="party">
                    <p><strong>Le Locataire</strong></p>
                    <p>(Signature précédée de "Lu et approuvé")</p>
                    <div class="signature-box"></div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}
