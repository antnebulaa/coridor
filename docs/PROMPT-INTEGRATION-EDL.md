# PROMPT — Intégration EDL dans Coridor

## Contexte

Le flow EDL interne est implémenté et fonctionnel (Phases 1-6). Il faut maintenant l'intégrer dans l'app existante. L'EDL ne doit pas être une page isolée — il doit vivre dans les endroits où le propriétaire et le locataire vivent au quotidien.

L'EDL apparaît à **4 endroits** dans l'app. Voici les instructions pour chacun.

---

## 1. La Conversation (point d'entrée PRINCIPAL)

C'est ici que le proprio **démarre** l'EDL. La conversation est le fil rouge de toute la relation locative dans Coridor (candidature → dossier → bail → EDL).

### 1.1 Nouveau type de message système

Ajouter un type de message dans le système de conversation :

```typescript
type: "INSPECTION_EVENT"
metadata: {
  inspectionId: string,
  event: "SCHEDULED" | "REMINDER" | "STARTED" | "COMPLETED" | "SIGNED" | "PDF_READY" | "RECTIFICATION_REQUESTED" | "RECTIFICATION_DEADLINE" | "LOCKED",
  date: string, // ISO
  inspectionType: "ENTRY" | "EXIT",
  scheduledAt?: string, // date/heure du RDV
  pdfUrl?: string,
}
```

### 1.2 Rendu du message

Le composant de conversation doit rendre ce type de message comme une **carte interactive**, pas du texte brut :

- Icône 🏠 + titre "État des lieux d'entrée" (ou de sortie)
- Date et adresse du bien
- Statut visuel (🟡 Planifié / 🟢 En cours / ✅ Signé / ⚠️ Rectification)
- Bouton d'action contextuel :
  - SCHEDULED → [Démarrer l'EDL] (le jour J uniquement)
  - STARTED → [Reprendre l'EDL]
  - SIGNED → [Voir le PDF]
  - PDF_READY → [Télécharger le PDF]
  - RECTIFICATION_REQUESTED → [Voir la demande]

### 1.3 Action "Planifier l'EDL"

Ajouter dans la toolbar/actions de la conversation un bouton contextuel :
- Visible uniquement si le bail est signé ET qu'aucun EDL d'entrée n'existe
- Au clic → picker de date/heure
- À la validation → crée un message INSPECTION_EVENT (event: "SCHEDULED") dans la conversation + crée l'événement dans l'agenda (voir section 2)

### 1.4 Action "Démarrer l'EDL"

- Visible quand l'EDL est planifié (jour J ou après) OU quand un brouillon DRAFT existe
- Au clic → redirect vers `/inspection/new/[applicationId]` (si premier lancement) ou `/inspection/[id]/...` (si reprise de brouillon)

### 1.5 Messages système automatiques

Ces messages sont créés automatiquement par le backend à chaque changement de statut de l'EDL :

| Événement | Message affiché |
|---|---|
| EDL planifié | "🗓️ EDL d'entrée planifié pour le [date] à [heure]" |
| J-1 | "🔔 Rappel : EDL d'entrée demain à [heure] avec [nom locataire]" |
| EDL démarré | "🟢 EDL d'entrée démarré" |
| EDL complété (avant signature) | "✅ EDL terminé — En attente de signature locataire" |
| EDL signé | "✅ EDL d'entrée signé par les deux parties" |
| PDF prêt | "📄 PDF de l'état des lieux [Voir le PDF]" |
| Rectification demandée | "⚠️ [Nom locataire] a demandé une rectification : [description]" |
| Fin délai 10 jours | "🔒 Délai de rectification expiré — EDL verrouillé" |

---

## 2. L'Agenda (/agenda)

### 2.1 Nouveau type d'événement

Ajouter au modèle d'événement (ou au type existant) :

```typescript
eventType: "VISIT" | "INSPECTION_ENTRY" | "INSPECTION_EXIT"
```

### 2.2 Affichage

- Couleur distincte : #E8A838 (accent ambrée Coridor) pour les EDL, différente des visites
- Contenu de la carte : titre "🏠 EDL d'entrée", nom du locataire, adresse, statut
- Boutons : [Démarrer l'EDL] (jour J) / [Reprogrammer] / [Annuler]

### 2.3 Notification au locataire

Quand l'événement est créé :
1. Le locataire reçoit une notification "EDL d'entrée proposé le [date] à [heure]"
2. Il peut confirmer ou proposer un autre créneau (même pattern que les créneaux de visite si ce flow existe déjà)
3. L'événement passe en "Confirmé" quand le locataire accepte

### 2.4 Rappels automatiques

- J-1 : notification push + message dans la conversation
- Jour J matin : notification push "EDL aujourd'hui à [heure]"

---

## 3. Le Dashboard Propriétaire (/dashboard)

### 3.1 Carte contextuelle dans la section "Actions requises"

L'EDL apparaît dans le dashboard **UNIQUEMENT quand il y a une action à faire** :

| Condition | Carte affichée |
|---|---|
| EDL planifié demain ou aujourd'hui | "🏠 EDL d'entrée [demain/aujourd'hui] — [nom] — [heure]" + [Voir agenda] |
| EDL en DRAFT (brouillon non terminé) | "🟡 EDL en cours — [X/Y pièces] — [nom]" + [Reprendre l'EDL →] |
| EDL en PENDING_SIGNATURE | "⏳ Attente signature — [nom]" + [Renvoyer le lien] |
| Rectification demandée | "⚠️ Rectification — [nom] — [description courte]" + [Voir →] |

**Ne PAS afficher** les EDL terminés (SIGNED/LOCKED) — ils ne nécessitent aucune action.

### 3.2 Le lien "Reprendre l'EDL"

- Redirect vers la bonne étape du flow selon l'état du brouillon
- Si meters fait mais pas les pièces → /inspection/[id]/rooms
- Si pièces en cours → /inspection/[id]/rooms/[lastRoomId]
- Logique : vérifier le status de chaque étape et redirect vers la première non complétée

---

## 4. La Page de gestion du bien (section Location)

### 4.1 Sous-section "États des lieux"

Dans la page d'édition/gestion du bien, section "Location" (là où le proprio voit les infos de location en cours), ajouter :

```
📋 États des lieux

EDL d'entrée — 20 fév 2026
✅ Signé · Marie Dupont
[Voir le PDF] [Voir dans la conversation]

EDL de sortie
○ Non planifié
[Planifier l'EDL de sortie →]
```

- Si pas de bail actif → ne pas afficher cette section
- Si bail actif mais pas d'EDL → afficher "Aucun EDL — [Planifier]"
- Le bouton "Planifier" redirige vers la conversation (c'est là qu'on planifie)
- Le bouton "Voir le PDF" ouvre le document
- Le bouton "Voir dans la conversation" scrolle au bon message

---

## Ordre d'implémentation recommandé

1. **Messages système dans la conversation** (le plus impactant — c'est le point d'entrée principal)
2. **Dashboard** (les cartes d'action — rapide à faire)
3. **Agenda** (nouveau type d'événement + notifications)
4. **Page du bien** (le plus simple — juste de l'affichage)

## Fichiers à modifier

| Fichier existant | Modification |
|---|---|
| Composant conversation (rendu messages) | Ajouter rendu pour type INSPECTION_EVENT |
| Composant conversation (toolbar/actions) | Ajouter bouton "Planifier EDL" / "Démarrer EDL" |
| Page agenda | Ajouter type d'événement EDL + couleur ambrée |
| Page dashboard | Ajouter carte EDL dans "Actions requises" |
| Page gestion du bien (section Location) | Ajouter sous-section "États des lieux" |
| Système de notifications | Ajouter templates rappel EDL |
| API inspection (create/update) | Créer les messages système dans la conversation à chaque changement de statut |
