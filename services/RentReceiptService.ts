import prisma from "@/libs/prismadb";
import { createElement } from 'react';
import { createNotification } from "@/libs/notifications";
import { sendEmail } from "@/lib/email";
import { EmailTemplate } from "@/components/emails/EmailTemplate";

export interface RentReceiptData {
  // Propriétaire
  landlordName: string;
  landlordAddress: string;

  // Locataire
  tenantName: string;

  // Logement
  propertyAddress: string;

  // Période
  periodStart: Date;
  periodEnd: Date;

  // Montants (en euros)
  rentAmount: number;       // Loyer HC
  chargesAmount: number;    // Charges
  totalAmount: number;      // Total

  // Type de document
  isPartialPayment: boolean;

  // Métadonnées
  receiptId: string;
  emissionDate: Date;
}

export class RentReceiptService {

  /**
   * Génère une quittance pour un bail et un mois donné.
   * Retourne le RentReceipt créé.
   */
  static async generateReceipt(applicationId: string, year: number, month: number): Promise<any> {
    // 1. Vérifier que le bail existe et est signé
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          include: {
            rentalUnit: {
              include: {
                property: {
                  include: { owner: true }
                }
              }
            }
          }
        },
        candidateScope: {
          include: {
            creatorUser: true
          }
        },
        financials: {
          orderBy: { startDate: 'desc' }
        },
        matchedTransactions: true
      }
    });

    if (!application) throw new Error("Bail introuvable");
    if (application.leaseStatus !== 'SIGNED') throw new Error("Le bail n'est pas signé");

    // 2. Calculer la période
    const periodStart = new Date(year, month - 1, 1); // Premier jour du mois
    const periodEnd = new Date(year, month, 0); // Dernier jour du mois

    // 3. Vérifier qu'une quittance n'existe pas déjà
    const existing = await prisma.rentReceipt.findUnique({
      where: {
        rentalApplicationId_periodStart: {
          rentalApplicationId: applicationId,
          periodStart
        }
      }
    });
    if (existing) throw new Error("Une quittance existe déjà pour cette période");

    // 4. Trouver les montants attendus (LeaseFinancials actif pour cette période)
    const activeFinancial = application.financials.find(f => {
      const fStart = new Date(f.startDate);
      const fEnd = f.endDate ? new Date(f.endDate) : null;
      return fStart <= periodEnd && (!fEnd || fEnd >= periodStart);
    });

    if (!activeFinancial) throw new Error("Aucun barème financier trouvé pour cette période");

    const expectedRentCents = activeFinancial.baseRentCents;
    const expectedChargesCents = activeFinancial.serviceChargesCents;
    const expectedTotalCents = expectedRentCents + expectedChargesCents;

    // 5. Chercher les transactions matchées pour ce mois
    const matchedTransactions = application.matchedTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === year && txDate.getMonth() === month - 1;
    });

    let actualTotalCents: number;
    let isPartialPayment = false;

    if (matchedTransactions.length > 0) {
      // Utiliser le montant réel des transactions
      const totalPaid = matchedTransactions.reduce((sum, tx) => sum + Math.round(Math.abs(tx.amount) * 100), 0);
      actualTotalCents = totalPaid;
      isPartialPayment = actualTotalCents < expectedTotalCents;
    } else {
      // Pas de transaction matchée → utiliser le montant attendu
      actualTotalCents = expectedTotalCents;
    }

    // Répartir le montant entre loyer et charges (proportionnellement)
    const ratio = expectedTotalCents > 0 ? actualTotalCents / expectedTotalCents : 1;
    const rentAmountCents = Math.round(expectedRentCents * ratio);
    const chargesAmountCents = actualTotalCents - rentAmountCents;

    // 6. Créer le RentReceipt
    const receipt = await prisma.rentReceipt.create({
      data: {
        rentalApplicationId: applicationId,
        periodStart,
        periodEnd,
        rentAmountCents,
        chargesAmountCents,
        totalAmountCents: actualTotalCents,
        isPartialPayment
      }
    });

    return receipt;
  }

  /**
   * Récupère toutes les données nécessaires pour générer le PDF
   */
  static async getReceiptData(receiptId: string): Promise<RentReceiptData> {
    const receipt = await prisma.rentReceipt.findUnique({
      where: { id: receiptId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: {
                      include: { owner: true }
                    }
                  }
                }
              }
            },
            candidateScope: {
              include: {
                creatorUser: true
              }
            }
          }
        }
      }
    });

    if (!receipt) throw new Error("Quittance introuvable");

    const app = receipt.rentalApplication;
    const property = app.listing.rentalUnit.property;
    const owner = property.owner;
    const tenant = app.candidateScope.creatorUser;

    const formatName = (u: any) => {
      if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
      return u.name || "Nom inconnu";
    };

    const formatAddress = (p: any) => {
      const parts = [];
      if (p.addressLine1) parts.push(p.addressLine1);
      if (p.apartment) parts.push(`Appt ${p.apartment}`);
      if (p.building) parts.push(`Bat ${p.building}`);
      if (p.zipCode && p.city) parts.push(`${p.zipCode} ${p.city}`);
      return parts.join(', ') || p.address || 'Adresse non renseignée';
    };

    const ownerAddress = formatAddress(owner);

    return {
      landlordName: formatName(owner),
      landlordAddress: ownerAddress,
      tenantName: formatName(tenant),
      propertyAddress: formatAddress(property),
      periodStart: receipt.periodStart,
      periodEnd: receipt.periodEnd,
      rentAmount: receipt.rentAmountCents / 100,
      chargesAmount: receipt.chargesAmountCents / 100,
      totalAmount: receipt.totalAmountCents / 100,
      isPartialPayment: receipt.isPartialPayment,
      receiptId: receipt.id,
      emissionDate: receipt.createdAt
    };
  }

  /**
   * Envoie la notification + email au locataire
   */
  static async sendReceiptNotification(receiptId: string): Promise<void> {
    const receipt = await prisma.rentReceipt.findUnique({
      where: { id: receiptId },
      include: {
        rentalApplication: {
          include: {
            candidateScope: {
              include: { creatorUser: true }
            }
          }
        }
      }
    });

    if (!receipt) return;

    const tenant = receipt.rentalApplication.candidateScope.creatorUser;
    const monthName = receipt.periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const docType = receipt.isPartialPayment ? 'reçu' : 'quittance';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr';

    // Notification in-app
    await createNotification({
      userId: tenant.id,
      type: 'RENT_RECEIPT',
      title: `Votre ${docType} de loyer est disponible`,
      message: `Votre ${docType} de loyer pour ${monthName} est disponible au téléchargement.`,
      link: '/account/receipts'
    });

    // Email
    if (tenant.email) {
      const tenantName = tenant.firstName || tenant.name || 'Cher locataire';

      await sendEmail(
        tenant.email,
        `Votre ${docType} de loyer — ${monthName}`,
        createElement(
          EmailTemplate,
          {
            heading: `${tenantName}, votre ${docType} est disponible`,
            actionLabel: 'Voir mes quittances',
            actionUrl: `${appUrl}/account/receipts`,
            children: null,
          },
          createElement(
            'p',
            { style: { margin: '0 0 16px' } },
            `Votre ${docType} de loyer pour ${monthName} a été générée et est disponible dans votre espace Coridor.`
          ),
          createElement(
            'p',
            { style: { margin: '0 0 16px' } },
            `Montant total : ${(receipt.totalAmountCents / 100).toFixed(2)} \u20ac`
          )
        )
      );
    }

    // Marquer comme envoyée
    await prisma.rentReceipt.update({
      where: { id: receiptId },
      data: { sentAt: new Date() }
    });
  }
}
