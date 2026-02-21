import {
    Home, Key, Settings,
    Type, AlignLeft, DoorOpen, MapPin, Sparkles, Armchair, Camera,
    Calendar, FileText, Euro, User, FileCheck, Eye, Trash2, ChartBar,
    Scale, CreditCard, Thermometer, ClipboardCheck
} from "lucide-react";
import { TabType, SectionType } from "./EditPropertyClient";

export const sidebarTabs = [
    { id: 'logement', icon: Home, label: 'Logement' },
    { id: 'location', icon: Key, label: 'Location' },
    { id: 'preferences', icon: Settings, label: 'Préférences' },
] as const;

export const sidebarLinks: Record<TabType, { id: string; label: string; icon: any }[]> = {
    logement: [
        { id: 'title', label: 'Titre de l\'annonce', icon: Type },
        { id: 'description', label: 'Description détaillée', icon: AlignLeft },
        { id: 'rooms', label: 'Configuration des chambres', icon: DoorOpen },
        { id: 'location', label: 'Emplacement', icon: MapPin },
        { id: 'category', label: 'Type de logement', icon: Home },
        { id: 'amenities', label: 'Atouts', icon: Sparkles },
        { id: 'furniture', label: 'Équipements', icon: Armchair },
        { id: 'photos', label: 'Gestion des photos', icon: Camera },
        { id: 'legalInfo', label: 'Informations Legales', icon: Scale },
        { id: 'diagnostics', label: 'Diagnostics Immobiliers', icon: Thermometer },
    ],
    location: [
        { id: 'leaseType', label: 'Mode de location', icon: Home },
        { id: 'visits', label: 'Visites', icon: Calendar },
        { id: 'lease', label: 'Bail', icon: FileText },
        { id: 'price', label: 'Loyer', icon: Euro },
        { id: 'leaseConditions', label: 'Conditions du Bail', icon: CreditCard },
        { id: 'edl', label: 'États des lieux', icon: ClipboardCheck },
        { id: 'tenant', label: 'Profil locataire', icon: User },
        { id: 'application', label: 'Paramètres de candidature', icon: FileCheck },
        { id: 'expenses', label: 'Dépenses & Charges', icon: ChartBar },
    ],
    preferences: [
        { id: 'status', label: 'Statut de l\'annonce', icon: Eye },
        { id: 'delete', label: 'Supprimer l\'annonce', icon: Trash2 },
    ]
};
