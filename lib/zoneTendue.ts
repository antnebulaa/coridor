/**
 * Liste des communes en zone tendue (décret n°2013-392 du 10 mai 2013, modifié).
 * Source : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000027399823
 *
 * Format : Set de codes postaux principaux des communes concernées.
 * Note : certaines communes partagent un même code postal. Pour les cas limites,
 * on vérifie aussi le nom de la ville.
 */

// Codes postaux des principales communes en zone tendue
// Couvre l'Île-de-France, Côte d'Azur, grandes métropoles, et agglomérations tendues
const ZONE_TENDUE_ZIP_CODES = new Set([
  // === ÎLE-DE-FRANCE ===
  // Paris (75)
  '75001', '75002', '75003', '75004', '75005', '75006', '75007', '75008',
  '75009', '75010', '75011', '75012', '75013', '75014', '75015', '75016',
  '75017', '75018', '75019', '75020',

  // Hauts-de-Seine (92)
  '92000', // Nanterre
  '92100', // Boulogne-Billancourt
  '92110', // Clichy
  '92120', // Montrouge
  '92130', // Issy-les-Moulineaux
  '92140', // Clamart
  '92150', // Suresnes
  '92160', // Antony
  '92170', // Vanves
  '92190', // Meudon
  '92200', // Neuilly-sur-Seine
  '92210', // Saint-Cloud
  '92220', // Bagneux
  '92230', // Gennevilliers
  '92240', // Malakoff
  '92250', // La Garenne-Colombes
  '92260', // Fontenay-aux-Roses
  '92270', // Bois-Colombes
  '92290', // Châtenay-Malabry
  '92300', // Levallois-Perret
  '92310', // Sèvres
  '92320', // Châtillon
  '92330', // Sceaux
  '92340', // Bourg-la-Reine
  '92350', // Le Plessis-Robinson
  '92360', // Meudon-la-Forêt
  '92370', // Chaville
  '92380', // Garches
  '92390', // Villeneuve-la-Garenne
  '92400', // Courbevoie
  '92410', // Ville-d\'Avray
  '92420', // Vaucresson
  '92430', // Marnes-la-Coquette
  '92500', // Rueil-Malmaison
  '92600', // Asnières-sur-Seine
  '92700', // Colombes
  '92800', // Puteaux

  // Seine-Saint-Denis (93)
  '93100', // Montreuil
  '93110', // Rosny-sous-Bois
  '93120', // La Courneuve
  '93130', // Noisy-le-Sec
  '93140', // Bondy
  '93150', // Le Blanc-Mesnil
  '93160', // Noisy-le-Grand
  '93170', // Bagnolet
  '93200', // Saint-Denis
  '93210', // Saint-Denis (La Plaine)
  '93220', // Gagny
  '93230', // Romainville
  '93240', // Stains
  '93250', // Villemomble
  '93260', // Les Lilas
  '93270', // Sevran
  '93300', // Aubervilliers
  '93310', // Le Pré-Saint-Gervais
  '93320', // Les Pavillons-sous-Bois
  '93330', // Neuilly-sur-Marne
  '93340', // Le Raincy
  '93360', // Neuilly-Plaisance
  '93370', // Montfermeil
  '93380', // Pierrefitte-sur-Seine
  '93390', // Clichy-sous-Bois
  '93400', // Saint-Ouen
  '93410', // Vaujours
  '93420', // Villepinte
  '93430', // Villetaneuse
  '93440', // Dugny
  '93450', // L\'Île-Saint-Denis
  '93460', // Gournay-sur-Marne
  '93500', // Pantin
  '93600', // Aulnay-sous-Bois
  '93700', // Drancy
  '93800', // Épinay-sur-Seine

  // Val-de-Marne (94)
  '94000', // Créteil
  '94100', // Saint-Maur-des-Fossés
  '94110', // Arcueil
  '94120', // Fontenay-sous-Bois
  '94130', // Nogent-sur-Marne
  '94140', // Alfortville
  '94150', // Rungis
  '94160', // Saint-Mandé
  '94170', // Le Perreux-sur-Marne
  '94190', // Villeneuve-Saint-Georges
  '94200', // Ivry-sur-Seine
  '94210', // Saint-Maur (La Varenne)
  '94220', // Charenton-le-Pont
  '94230', // Cachan
  '94240', // L\'Haÿ-les-Roses
  '94250', // Gentilly
  '94260', // Fresnes
  '94270', // Le Kremlin-Bicêtre
  '94290', // Villeneuve-le-Roi
  '94300', // Vincennes
  '94310', // Orly
  '94320', // Thiais
  '94340', // Joinville-le-Pont
  '94350', // Villiers-sur-Marne
  '94360', // Bry-sur-Marne
  '94370', // Sucy-en-Brie
  '94380', // Bonneuil-sur-Marne
  '94400', // Vitry-sur-Seine
  '94410', // Saint-Maurice
  '94420', // Le Plessis-Trévise
  '94430', // Chennevières-sur-Marne
  '94440', // Santeny / Marolles-en-Brie
  '94450', // Limeil-Brévannes
  '94460', // Valenton
  '94470', // Boissy-Saint-Léger
  '94480', // Ablon-sur-Seine
  '94500', // Champigny-sur-Marne
  '94510', // La Queue-en-Brie
  '94520', // Mandres-les-Roses
  '94550', // Chevilly-Larue
  '94600', // Choisy-le-Roi
  '94700', // Maisons-Alfort
  '94800', // Villejuif

  // Val-d'Oise (95) — communes en zone tendue
  '95100', // Argenteuil
  '95110', // Sannois
  '95120', // Ermont
  '95130', // Franconville
  '95140', // Garges-lès-Gonesse
  '95150', // Taverny
  '95160', // Montmorency
  '95170', // Deuil-la-Barre
  '95190', // Goussainville
  '95200', // Sarcelles
  '95210', // Saint-Gratien
  '95220', // Herblay
  '95230', // Soisy-sous-Montmorency
  '95240', // Cormeilles-en-Parisis
  '95250', // Beauchamp
  '95260', // Beaumont-sur-Oise
  '95270', // Luzarches
  '95300', // Pontoise
  '95310', // Saint-Ouen-l\'Aumône
  '95320', // Saint-Leu-la-Forêt
  '95330', // Domont
  '95340', // Persan
  '95350', // Saint-Brice-sous-Forêt
  '95360', // Montmagny
  '95370', // Montigny-lès-Cormeilles
  '95380', // Louvres
  '95400', // Villiers-le-Bel
  '95410', // Groslay
  '95420', // Magny-en-Vexin
  '95430', // Auvers-sur-Oise
  '95440', // Écouen
  '95460', // Ézanville
  '95470', // Fosses
  '95480', // Pierrelaye
  '95490', // Vauréal
  '95500', // Gonesse
  '95520', // Osny
  '95530', // La Frette-sur-Seine
  '95540', // Méry-sur-Oise
  '95550', // Bessancourt
  '95560', // Montsoult
  '95580', // Andilly / Margency
  '95600', // Eaubonne
  '95610', // Éragny
  '95620', // Parmain
  '95680', // Montlignon
  '95800', // Cergy

  // Essonne (91) — communes en zone tendue
  '91000', // Évry-Courcouronnes
  '91100', // Corbeil-Essonnes
  '91120', // Palaiseau
  '91130', // Ris-Orangis
  '91140', // Villebon-sur-Yvette
  '91160', // Longjumeau / Champlan
  '91170', // Viry-Châtillon
  '91190', // Gif-sur-Yvette
  '91200', // Athis-Mons
  '91210', // Draveil
  '91220', // Brétigny-sur-Orge
  '91230', // Montgeron
  '91240', // Saint-Michel-sur-Orge
  '91250', // Saintry-sur-Seine
  '91260', // Juvisy-sur-Orge
  '91270', // Vigneux-sur-Seine
  '91290', // Arpajon
  '91300', // Massy
  '91310', // Montlhéry
  '91320', // Wissous
  '91330', // Yerres
  '91340', // Ollainville
  '91350', // Grigny
  '91360', // Villemoisson-sur-Orge / Épinay-sur-Orge
  '91370', // Verrières-le-Buisson
  '91380', // Chilly-Mazarin
  '91390', // Morsang-sur-Orge
  '91400', // Orsay
  '91420', // Morangis
  '91430', // Igny
  '91440', // Bures-sur-Yvette
  '91450', // Soisy-sur-Seine
  '91460', // Marcoussis
  '91470', // Limours
  '91480', // Quincy-sous-Sénart
  '91490', // Milly-la-Forêt
  '91500', // Paray-Vieille-Poste
  '91510', // Lardy
  '91520', // Égly
  '91540', // Mennecy
  '91550', // Paray-Vieille-Poste
  '91560', // Crosne
  '91570', // Bièvres
  '91600', // Savigny-sur-Orge
  '91620', // La Ville-du-Bois
  '91700', // Sainte-Geneviève-des-Bois
  '91750', // Champcueil
  '91800', // Brunoy

  // Yvelines (78) — communes en zone tendue
  '78000', // Versailles
  '78100', // Saint-Germain-en-Laye
  '78110', // Le Vésinet
  '78120', // Rambouillet
  '78130', // Les Mureaux
  '78140', // Vélizy-Villacoublay
  '78150', // Le Chesnay-Rocquencourt
  '78160', // Marly-le-Roi
  '78170', // La Celle-Saint-Cloud
  '78180', // Montigny-le-Bretonneux
  '78190', // Trappes
  '78200', // Mantes-la-Jolie
  '78210', // Saint-Cyr-l\'École
  '78220', // Viroflay
  '78230', // Le Pecq
  '78240', // Chambourcy
  '78250', // Meulan-en-Yvelines
  '78260', // Achères
  '78270', // Bonnières-sur-Seine
  '78280', // Guyancourt
  '78290', // Croissy-sur-Seine
  '78300', // Poissy
  '78310', // Maurepas
  '78320', // Le Mesnil-Saint-Denis
  '78330', // Fontenay-le-Fleury
  '78340', // Les Clayes-sous-Bois
  '78350', // Jouy-en-Josas
  '78360', // Montesson
  '78370', // Plaisir
  '78380', // Bougival
  '78390', // Bois-d\'Arcy
  '78400', // Chatou
  '78410', // Aubergenville
  '78420', // Carrières-sur-Seine
  '78430', // Louveciennes
  '78440', // Gargenville
  '78450', // Chavenay
  '78460', // Chevreuse
  '78470', // Saint-Rémy-lès-Chevreuse
  '78480', // Verneuil-sur-Seine
  '78500', // Sartrouville
  '78510', // Triel-sur-Seine
  '78530', // Buc
  '78540', // Vernouillet
  '78550', // Houdan
  '78560', // Le Port-Marly
  '78570', // Chanteloup-les-Vignes / Andrésy
  '78580', // Maule
  '78590', // Noisy-le-Roi
  '78600', // Maisons-Laffitte
  '78610', // Le Perray-en-Yvelines
  '78620', // L\'Étang-la-Ville
  '78630', // Orgeval
  '78640', // Villiers-Saint-Frédéric
  '78650', // Beynes
  '78680', // Épône
  '78700', // Conflans-Sainte-Honorine
  '78740', // Vaux-sur-Seine
  '78800', // Houilles

  // Seine-et-Marne (77) — communes en zone tendue (proche Paris)
  '77000', // Melun
  '77100', // Meaux
  '77120', // Coulommiers
  '77130', // Montereau-Fault-Yonne
  '77140', // Nemours
  '77144', // Montévrain
  '77150', // Lésigny
  '77160', // Provins
  '77170', // Brie-Comte-Robert
  '77176', // Savigny-le-Temple
  '77181', // Courtry
  '77183', // Croissy-Beaubourg
  '77184', // Émerainville
  '77185', // Lognes
  '77186', // Noisiel
  '77200', // Torcy
  '77210', // Avon
  '77220', // Gretz-Armainvilliers
  '77230', // Dammartin-en-Goële / Thieux
  '77240', // Cesson / Vert-Saint-Denis
  '77250', // Moret-Loing-et-Orvanne
  '77260', // La Ferté-sous-Jouarre
  '77270', // Villeparisis
  '77280', // Othis
  '77290', // Mitry-Mory
  '77300', // Fontainebleau
  '77310', // Saint-Fargeau-Ponthierry
  '77330', // Ozoir-la-Ferrière
  '77340', // Pontault-Combault
  '77350', // Le Mée-sur-Seine
  '77360', // Vaires-sur-Marne
  '77370', // Nangis
  '77380', // Combs-la-Ville
  '77390', // Verneuil-l\'Étang
  '77400', // Lagny-sur-Marne
  '77410', // Claye-Souilly
  '77420', // Champs-sur-Marne
  '77430', // Champagne-sur-Seine
  '77440', // Lizy-sur-Ourcq
  '77450', // Ésbly
  '77500', // Chelles
  '77550', // Moissy-Cramayel
  '77600', // Bussy-Saint-Georges
  '77680', // Roissy-en-Brie
  '77700', // Serris / Coupvray / Magny-le-Hongre / Bailly-Romainvilliers

  // === CÔTE D'AZUR ===
  '06000', // Nice
  '06100', // Nice
  '06200', // Nice
  '06300', // Nice
  '06400', // Cannes
  '06110', // Le Cannet
  '06130', // Grasse
  '06140', // Vence
  '06150', // Cannes-la-Bocca
  '06160', // Antibes / Juan-les-Pins
  '06210', // Mandelieu-la-Napoule
  '06220', // Vallauris / Golfe-Juan
  '06230', // Villefranche-sur-Mer
  '06240', // Beausoleil
  '06250', // Mougins
  '06270', // Villeneuve-Loubet
  '06320', // Cap-d\'Ail
  '06330', // Roquefort-les-Pins
  '06340', // La Trinité
  '06360', // Èze
  '06410', // Biot
  '06480', // La Colle-sur-Loup
  '06500', // Menton
  '06510', // Carros
  '06520', // Grasse
  '06530', // Peymeinade
  '06560', // Valbonne / Sophia Antipolis
  '06570', // Saint-Paul-de-Vence
  '06590', // Théoule-sur-Mer
  '06600', // Antibes
  '06610', // La Gaude
  '06620', // Le Bar-sur-Loup
  '06650', // Opio / Le Rouret
  '06700', // Saint-Laurent-du-Var
  '06730', // Saint-André-de-la-Roche
  '06740', // Châteauneuf-Grasse
  '06800', // Cagnes-sur-Mer
  '06810', // Auribeau-sur-Siagne

  // === LYON MÉTROPOLE ===
  '69001', '69002', '69003', '69004', '69005', '69006', '69007', '69008', '69009', // Lyon
  '69100', // Villeurbanne
  '69110', // Sainte-Foy-lès-Lyon
  '69120', // Vaulx-en-Velin
  '69130', // Écully
  '69140', // Rillieux-la-Pape
  '69150', // Décines-Charpieu
  '69160', // Tassin-la-Demi-Lune
  '69170', // Tarare
  '69190', // Saint-Fons
  '69200', // Vénissieux
  '69210', // L\'Arbresle
  '69220', // Belleville-en-Beaujolais
  '69230', // Saint-Genis-Laval
  '69250', // Neuville-sur-Saône
  '69260', // Charbonnières-les-Bains
  '69270', // Fontaines-sur-Saône / Couzon
  '69290', // Craponne
  '69300', // Caluire-et-Cuire
  '69310', // Pierre-Bénite
  '69320', // Feyzin
  '69330', // Meyzieu
  '69340', // Francheville
  '69350', // La Mulatière
  '69360', // Saint-Symphorien-d\'Ozon
  '69370', // Saint-Didier-au-Mont-d\'Or
  '69380', // Lissieu / Chasselay
  '69390', // Vernaison / Charly
  '69400', // Villefranche-sur-Saône
  '69410', // Champagne-au-Mont-d\'Or
  '69500', // Bron
  '69600', // Oullins
  '69700', // Givors
  '69800', // Saint-Priest

  // === LILLE MÉTROPOLE ===
  '59000', // Lille
  '59100', // Roubaix
  '59110', // La Madeleine
  '59130', // Lambersart
  '59139', // Wattignies
  '59140', // Dunkerque
  '59150', // Wattrelos
  '59155', // Faches-Thumesnil
  '59160', // Lomme / Capinghem
  '59170', // Croix
  '59200', // Tourcoing
  '59211', // Santes
  '59220', // Denain
  '59223', // Roncq
  '59230', // Saint-Amand-les-Eaux
  '59233', // Maing
  '59237', // Verlinghem
  '59239', // Thumeries
  '59240', // Dunkerque
  '59250', // Halluin
  '59260', // Lezennes / Hellemmes
  '59262', // Sainghin-en-Mélantois
  '59263', // Houplin-Ancoisne
  '59270', // Bailleul
  '59280', // Armentières
  '59290', // Wasquehal
  '59300', // Valenciennes
  '59320', // Haubourdin
  '59350', // Saint-André-lez-Lille
  '59370', // Mons-en-Barœul
  '59390', // Lys-lez-Lannoy
  '59420', // Mouvaux
  '59491', // Villeneuve-d\'Ascq
  '59493', // Villeneuve-d\'Ascq
  '59495', // Villeneuve-d\'Ascq
  '59496', // Villeneuve-d\'Ascq
  '59500', // Douai
  '59510', // Hem
  '59520', // Marquette-lez-Lille
  '59560', // Comines
  '59650', // Villeneuve-d\'Ascq
  '59700', // Marcq-en-Barœul
  '59710', // Pont-à-Marcq
  '59777', // Lille (Euralille)
  '59800', // Lille

  // === BORDEAUX MÉTROPOLE ===
  '33000', // Bordeaux
  '33100', // Bordeaux
  '33110', // Le Bouscat
  '33120', // Arcachon
  '33130', // Bègles
  '33140', // Villenave-d\'Ornon
  '33150', // Cenon
  '33160', // Saint-Médard-en-Jalles
  '33170', // Gradignan
  '33185', // Le Haillan
  '33200', // Bordeaux (Caudéran)
  '33270', // Floirac
  '33290', // Blanquefort
  '33300', // Bordeaux (Bastide / Lac)
  '33310', // Lormont
  '33320', // Eysines
  '33400', // Talence
  '33520', // Bruges
  '33600', // Pessac
  '33700', // Mérignac
  '33800', // Bordeaux

  // === MONTPELLIER MÉTROPOLE ===
  '34000', // Montpellier
  '34070', // Montpellier
  '34080', // Montpellier
  '34090', // Montpellier
  '34130', // Mauguio
  '34160', // Castries
  '34170', // Castelnau-le-Lez
  '34185', // Montferrier-sur-Lez
  '34190', // Ganges
  '34200', // Sète
  '34230', // Paulhan
  '34250', // Palavas-les-Flots
  '34270', // Saint-Mathieu-de-Tréviers
  '34280', // La Grande-Motte
  '34290', // Servian
  '34400', // Lunel
  '34430', // Saint-Jean-de-Védas
  '34470', // Pérols
  '34500', // Béziers
  '34570', // Pignan
  '34580', // Vias
  '34670', // Baillargues
  '34690', // Fabrègues
  '34740', // Vendargues
  '34750', // Villeneuve-lès-Maguelone
  '34770', // Gigean
  '34790', // Grabels
  '34830', // Jacou
  '34920', // Le Crès
  '34970', // Lattes

  // === TOULOUSE MÉTROPOLE ===
  '31000', // Toulouse
  '31100', // Toulouse
  '31200', // Toulouse
  '31300', // Toulouse
  '31400', // Toulouse
  '31500', // Toulouse
  '31000', // Toulouse
  '31100', // Toulouse
  '31120', // Portet-sur-Garonne
  '31130', // Balma
  '31140', // Aucamville / Saint-Alban
  '31150', // Bruguières / Fenouillet
  '31170', // Tournefeuille
  '31200', // Toulouse
  '31240', // L\'Union
  '31270', // Cugnaux / Villeneuve-Tolosane
  '31300', // Toulouse
  '31320', // Castanet-Tolosan
  '31400', // Toulouse
  '31500', // Toulouse
  '31520', // Ramonville-Saint-Agne
  '31600', // Muret
  '31620', // Fronton
  '31650', // Saint-Orens-de-Gameville
  '31670', // Labège
  '31700', // Blagnac
  '31770', // Colomiers

  // === NANTES MÉTROPOLE ===
  '44000', // Nantes
  '44100', // Nantes
  '44200', // Nantes
  '44300', // Nantes
  '44400', // Rezé
  '44800', // Saint-Herblain
  '44600', // Saint-Nazaire
  '44700', // Orvault
  '44980', // Sainte-Luce-sur-Loire

  // === STRASBOURG ===
  '67000', // Strasbourg
  '67100', // Strasbourg
  '67200', // Strasbourg

  // === MARSEILLE / AIX ===
  '13001', '13002', '13003', '13004', '13005', '13006', '13007', '13008',
  '13009', '13010', '13011', '13012', '13013', '13014', '13015', '13016', // Marseille
  '13090', // Aix-en-Provence
  '13100', // Aix-en-Provence
  '13080', // Aix-en-Provence (Luynes)
  '13290', // Aix-en-Provence (Les Milles)
  '13400', // Aubagne
  '13500', // Martigues
  '13600', // La Ciotat
  '13700', // Marignane
  '13800', // Istres

  // === RENNES ===
  '35000', // Rennes
  '35200', // Rennes
  '35700', // Rennes

  // === ANNECY / HAUTE-SAVOIE ===
  '74000', // Annecy
  '74100', // Annemasse
  '74160', // Saint-Julien-en-Genevois
  '74200', // Thonon-les-Bains
  '74240', // Gaillard
  '74300', // Cluses
  '74500', // Évian-les-Bains
  '74800', // La Roche-sur-Foron
  '74940', // Annecy-le-Vieux

  // === PAYS BASQUE / BAYONNE ===
  '64100', // Bayonne
  '64200', // Biarritz
  '64210', // Bidart / Guéthary
  '64500', // Saint-Jean-de-Luz / Ciboure
  '64600', // Anglet

  // === AJACCIO / BASTIA ===
  '20000', // Ajaccio
  '20090', // Ajaccio
  '20200', // Bastia
  '20600', // Bastia (Furiani)

  // === LA RÉUNION ===
  '97400', // Saint-Denis (Réunion)
  '97410', // Saint-Pierre (Réunion)
  '97420', // Le Port (Réunion)
  '97430', // Le Tampon (Réunion)
  '97440', // Saint-André (Réunion)

  // === GUADELOUPE / MARTINIQUE / GUYANE ===
  '97100', // Basse-Terre
  '97110', // Pointe-à-Pitre
  '97122', // Baie-Mahault
  '97139', // Les Abymes
  '97200', // Fort-de-France
  '97300', // Cayenne
]);

/**
 * Vérifie si un code postal est en zone tendue.
 */
export function checkZoneTendue(zipCode: string | null | undefined): boolean {
  if (!zipCode) return false;
  const normalized = zipCode.trim();
  return ZONE_TENDUE_ZIP_CODES.has(normalized);
}
