import { SafeUser } from "@/types";
import { format } from "date-fns";

export const generateDossierHtml = (user: SafeUser, profile: any) => {
    const currentDate = format(new Date(), 'dd/MM/yyyy');

    // Calculate total income
    const salary = profile?.netSalary || 0;
    const additional = profile?.additionalIncomes?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0;
    const totalIncome = salary + additional;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { text-align: center; font-size: 28px; margin-bottom: 10px; color: #2c3e50; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { text-align: center; font-size: 16px; color: #7f8c8d; margin-bottom: 40px; }
            h2 { font-size: 20px; margin-top: 30px; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; color: #2c3e50; }
            .section { margin-bottom: 25px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #555; }
            .value { font-weight: 500; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .guarantor-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <h1>Dossier de Location</h1>
        <div class="subtitle">Généré via Coridor le ${currentDate}</div>

        <div class="section">
            <h2>Informations Personnelles</h2>
            <div class="row">
                <span class="label">Nom complet :</span>
                <span class="value">${user.name || 'N/A'}</span>
            </div>
            <div class="row">
                <span class="label">Email :</span>
                <span class="value">${user.email}</span>
            </div>
            <div class="row">
                <span class="label">Téléphone :</span>
                <span class="value">${user.phoneNumber || 'N/A'}</span>
            </div>
            <div class="row">
                <span class="label">Date de naissance :</span>
                <span class="value">${user.birthDate ? format(new Date(user.birthDate), 'dd/MM/yyyy') : 'N/A'}</span>
            </div>
        </div>

        <div class="section">
            <h2>Situation Professionnelle & Revenus</h2>
            <div class="row">
                <span class="label">Poste actuel :</span>
                <span class="value">${profile?.jobTitle || 'Non renseigné'}</span>
            </div>
            <div class="row">
                <span class="label">Type de contrat :</span>
                <span class="value">${profile?.jobType || 'Non renseigné'}</span>
            </div>
            <div class="row">
                <span class="label">Salaire Net Mensuel :</span>
                <span class="value">${profile?.netSalary} €</span>
            </div>
            ${profile?.additionalIncomes?.length > 0 ? `
            <div class="row">
                <span class="label">Revenus additionnels :</span>
                <span class="value">${additional} €</span>
            </div>
            ` : ''}
            <div class="row" style="margin-top: 15px; border-top: 2px solid #ddd; padding-top: 10px;">
                <span class="label highlight">REVENUS TOTAUX :</span>
                <span class="value highlight">${totalIncome} € / mois</span>
            </div>
        </div>

        <div class="section">
            <h2>Garants</h2>
            ${profile?.guarantors?.length > 0 ? profile.guarantors.map((g: any) => `
                <div class="guarantor-card">
                    <div class="row">
                        <span class="label">Type :</span>
                        <span class="value">${g.type}</span>
                    </div>
                    <div class="row">
                        <span class="label">Statut :</span>
                        <span class="value">${g.status}</span>
                    </div>
                    <div class="row">
                        <span class="label">Revenus Net :</span>
                        <span class="value">${g.netIncome} €</span>
                    </div>
                </div>
            `).join('') : '<p>Aucun garant renseigné.</p>'}
        </div>

        <div class="section">
            <h2>Documents</h2>
            <p>Ce dossier est un récapitulatif des informations déclarées sur la plateforme Coridor. Les pièces justificatives originales peuvent être demandées par le propriétaire.</p>
        </div>
    </body>
    </html>
    `;
}
