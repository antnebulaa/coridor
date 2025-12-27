import { Home, Key, Settings } from "lucide-react";
import { TabType, SectionType } from "./EditPropertyClient";

export const sidebarTabs = [
    { id: 'logement', icon: Home, label: 'Logement' },
    { id: 'location', icon: Key, label: 'Location' },
    { id: 'preferences', icon: Settings, label: 'Préférences' },
] as const;

export const sidebarLinks: Record<TabType, { id: string; label: string }[]> = {
    logement: [
        { id: 'title', label: 'Titre de l\'annonce' },
        { id: 'description', label: 'Description détaillée' },
        { id: 'rooms', label: 'Configuration des chambres' },
        { id: 'location', label: 'Emplacement' },
        { id: 'category', label: 'Type de logement' },
        { id: 'amenities', label: 'Atouts' },
        { id: 'furniture', label: 'Équipements' },
        { id: 'availability', label: 'Disponibilité' },
        { id: 'photos', label: 'Gestion des photos' },
    ],
    location: [
        { id: 'visits', label: 'Visites' },
        { id: 'lease', label: 'Bail' },
        { id: 'price', label: 'Loyer' },
        { id: 'tenant', label: 'Profil locataire' },
        { id: 'application', label: 'Paramètres de candidature' },
    ],
    preferences: [
        { id: 'status', label: 'Statut de l\'annonce' },
        { id: 'delete', label: 'Supprimer l\'annonce' },
    ]
};
