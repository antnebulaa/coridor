export const LEASE_CLAUSES = {
    // 1. Clause de Solidarité
    SOLIDARITY: {
        STANDARD: `CLAUSE DE SOLIDARITÉ ET D'INDIVISIBILITÉ

Les locataires sont tenus, solidairement et indivisiblement, à l'égard du bailleur, du paiement des loyers, des charges et de toute somme due en application du présent bail. Le paiement total par l'un des locataires libère les autres.`,

        COLOCATION_ALUR: `CLAUSE DE SOLIDARITÉ ET D'INDIVISIBILITÉ (COLOCATION)

Les locataires sont tenus, solidairement et indivisiblement, à l'égard du bailleur, du paiement des loyers, des charges et de toute somme due en application du présent bail. Le paiement total par l'un des locataires libère les autres.

En cas de départ d'un colocataire, la solidarité de ce dernier et celle de sa caution s'éteignent au plus tard à l'expiration d'un délai de six mois après la date d'effet du congé, sauf si un nouveau colocataire le remplace avant la fin de ce délai.

Conformément à l'article 8-1 de la loi du 6 juillet 1989, la solidarité du colocataire sortant est limitée aux dettes locatives nées pendant sa période d'occupation effective du logement.`
    },

    // 2. Clause de Résiliation
    TERMINATION: {
        FURNISHED: `RÉSILIATION DU CONTRAT

Par le locataire : Le locataire peut résilier le contrat à tout moment, en respectant un préavis d'un (1) mois, y compris pour la location étudiante de 9 mois.

Par le bailleur : Le bailleur peut résilier le contrat à son échéance annuelle (ou fin des 9 mois étudiant) avec un préavis de trois (3) mois, en motivant son refus de renouvellement (vente, reprise pour habiter, ou motif légitime et sérieux).`,

        EMPTY: `RÉSILIATION DU CONTRAT

Par le locataire : Le locataire peut résilier le contrat à tout moment avec un préavis de trois (3) mois. Ce délai est réduit à un (1) mois si le logement est situé en "Zone Tendue" ou dans les cas prévus par la loi (mutation, perte d'emploi, premier emploi, RSA, état de santé).

Par le bailleur : Le bailleur peut donner congé à l'échéance du bail (tous les 3 ans) avec un préavis de six (6) mois, en motivant son refus (vente, reprise, motif légitime et sérieux).`,

        MOBILITY: `RÉSILIATION ET DURÉE

Le présent contrat est conclu pour une durée ferme. Il n'est ni renouvelable, ni reconductible.

Par le locataire : Le locataire peut résilier le contrat à tout moment en respectant un préavis d'un (1) mois. Par le bailleur : Le bailleur ne peut pas résilier le contrat avant son terme, sauf en cas de faute du locataire (clause résolutoire).`
    },

    // 3. Clause Résolutoire (Standard)
    RESOLUTORY: {
        STANDARD: `CLAUSE RÉSOLUTOIRE

Le présent contrat sera résilié de plein droit, un mois après un commandement de payer demeuré infructueux, en cas de défaut de paiement du loyer, des charges, ou de non-versement du dépôt de garantie.

Le contrat sera également résilié de plein droit en cas de défaut d'assurance locative, un mois après commandement resté infructueux.`
    },

    // 4. Clause de sous-location (art. 8 loi 89-462)
    SUBLETTING: {
        STANDARD: `CLAUSE DE SOUS-LOCATION

Conformément à l'article 8 de la loi du 6 juillet 1989, le locataire ne pourra sous-louer le logement sans l'accord écrit du bailleur, y compris sur le prix du sous-loyer. En cas de sous-location autorisée, le montant du sous-loyer ne pourra excéder celui du loyer principal.`
    },

    // 5. Clause d'assurance habitation obligatoire
    INSURANCE: {
        STANDARD: `ASSURANCE HABITATION OBLIGATOIRE

Le locataire est tenu de s'assurer contre les risques locatifs (incendie, dégâts des eaux, explosions) auprès d'une compagnie d'assurance de son choix et de justifier de cette assurance lors de la remise des clés puis chaque année à la demande du bailleur. À défaut de production de cette justification, le bailleur pourra mettre en œuvre la clause résolutoire prévue au présent contrat.`
    },

    // 6. Clause congé pour vente / droit de préemption (art. 15-II loi 89-462)
    PREEMPTION: {
        EMPTY: `DROIT DE PRÉEMPTION DU LOCATAIRE

En cas de vente du logement, le locataire bénéficie d'un droit de préemption dans les conditions prévues par l'article 15-II de la loi du 6 juillet 1989. Le bailleur doit notifier au locataire sa décision de vendre par lettre recommandée avec accusé de réception ou par acte d'huissier, au moins six mois avant le terme du bail.`,

        FURNISHED: `DROIT DE PRÉEMPTION DU LOCATAIRE

En cas de vente du logement, le locataire bénéficie d'un droit de préemption dans les conditions prévues par l'article 15-II de la loi du 6 juillet 1989. Le bailleur doit notifier au locataire sa décision de vendre par lettre recommandée avec accusé de réception ou par acte d'huissier, au moins trois mois avant le terme du bail.`
    },
};
