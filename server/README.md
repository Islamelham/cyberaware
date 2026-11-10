# CyberAware — Sensibilisation aux cyberattaques pour nouveaux collaborateurs

Projet AS52 : application mobile/tablette (web responsive) de mises en situation, avec répétition espacée, mesure de l'apprentissage et scénarios personnalisés par un système multi-agents IA.

## Lancer

**Sans IA (rien à installer)** : ouvrir `index.html` dans le navigateur. Les 24 scénarios écrits à la main sont utilisés.

**Avec le serveur (recommandé)** : Node.js 20.12 ou plus.
```
npm start
```
puis ouvrir http://127.0.0.1:3000.
- Sans clé API : mode **simulation** (gabarits, pour tester toute la chaîne). Le badge « ✨ IA (simulation) » s'affiche.
- Avec un modèle réel : copier `.env.example` en `.env`, renseigner `GEMINI_API_KEY`, relancer. Badge « ✨ IA ».

**Sur téléphone (test, même Wi-Fi)** : `npm run lan`, puis ouvrir sur le téléphone l'adresse `http://<IP>:3000` affichée dans le terminal. Autoriser Node.js dans le pare-feu Windows (réseau privé). Arrêter le serveur (Ctrl+C) après le test : en mode `lan`, l'application est visible par tout le réseau.

**Mode démo** : ajouter `?demo=1` à l'URL. Les rappels reviennent après 20 s, 60 s et 120 s au lieu de 1, 7 et 30 jours (utile pour la soutenance).

## Thèmes et sources
12 thèmes, 2 scénarios chacun (24 au total) : phishing, fraude au président, SMS frauduleux, faux support technique, support amovible inconnu, mots de passe et MFA, intrusion physique, noms de domaine trompeurs, **rançongiciels et sauvegardes**, **appareils mobiles et Wi-Fi**, **réseaux sociaux**, **usages pro et perso**.

- **Base documentaire** : le *Kit de sensibilisation* de Cybermalveillance.gouv.fr (Licence Ouverte / Etalab 2.0). Chaque scénario issu d'une fiche l'indique (champ `kit`, affiché après la correction) : mots de passe p. 3, réseaux sociaux p. 5, mobiles p. 7, sauvegardes p. 9, pro/perso p. 13, hameçonnage p. 15, rançongiciels p. 17, faux support p. 19.
- **Vecteur d'attaque et levier humain** : chaque scénario associe *par où* l'attaque arrive (messagerie, SMS, téléphone, Wi-Fi public, support amovible...) et *ce que l'ingénierie sociale exploite* (urgence, autorité, curiosité, gratuité, politesse...). Tout est dans `SCENARIO_META` (`scenarios.js`).
- **Contexte** : exercice fictif à l'UTBM. Le seul vrai domaine cité est `utbm.fr`, côté légitime. Tous les domaines pièges utilisent l'extension réservée `.example` (ex. `utbrn.example`, où « rn » imite le « m » ; `utbm.fr.portail-rh.example`, sous-domaine piégé). La charte et le canal de signalement sont fictifs.
- **Ordre des réponses** : les options sont mélangées à chaque affichage et la banque est équilibrée (la bonne réponse n'occupe pas toujours la même position ; 3 ou 4 options selon le scénario).

## Parcours utilisateur
1. **Test de niveau** (12 questions, sans correction)
2. **Apprentissage** avec correction, indices, article de charte et procédure de signalement. Une erreur rejoue le thème dans un scénario différent.
3. **Test final** (12 questions, sans correction) : comparaison avec le test de niveau
4. **Rappels espacés** à J+1, J+7, J+30 (boîtes de Leitner). Un oubli renvoie le thème en apprentissage.

À chaque réponse sont enregistrés : confiance (pas sûr / plutôt sûr / certain), temps de réponse, scénario, résultat. Export CSV depuis l'écran « Mes statistiques ».

## Interface
- **Gaspard**, la mascotte à casquette, accueille l'utilisateur, commente chaque scénario et réagit à chaque réponse : content (bonne réponse), inquiet (erreur), en alerte (erreur commise avec « certain »), réfléchit (question de confiance).
- Barre de progression, série de bonnes réponses 🔥, confettis aux étapes clés. Animations désactivées si l'utilisateur a demandé « réduire les animations ».
- Aucun style inline : compatible avec la politique de sécurité (CSP) du serveur.

## Architecture
| Fichier | Rôle |
|---|---|
| `scenarios.js` | Banque de scénarios (12 thèmes × 2 variantes), contexte UTBM fictif, métadonnées vecteur / levier / source kit |
| `engine.js` | Moteur : maîtrise, répétition espacée, tests, statistiques, export |
| `app.js`, `index.html`, `style.css` | Interface mobile-first |
| `mascot.js` | Mascotte **Gaspard** (personnage original en SVG, 5 humeurs) et bulles de dialogue |
| `ai.js` | Client IA : détecte le serveur, précharge les scénarios, repli sans IA |
| `server/server.js` | Serveur local : application + API `/api/generate` |
| `server/agents.js` | Agents **tuteur**, **générateur**, **critique** + contrôles locaux |
| `server/mock.js` | Backend de simulation (sans clé API) |
| `server/llm.js` | Appel au modèle (la clé reste côté serveur) |

### Boucle agentique
```
profil (erreurs, indices manqués, boîte, erreurs « certain »)
   └─> Tuteur : choisit le thème et la difficulté (facile / moyen / difficile)
         └─> Générateur (LLM) : scénario JSON
               └─> Contrôles locaux : schéma, 1 seule bonne réponse, domaines réservés (.example)
                     └─> Critique (LLM) : cohérence, indices réellement visibles, absence de contenu réel/dangereux
                           ├─ approuvé  -> envoyé au navigateur
                           └─ refusé    -> corrections renvoyées au générateur (3 essais max)
```

### Sécurité (points à valoriser dans le rapport)
- Clé API uniquement côté serveur, jamais dans le navigateur.
- Serveur lié à 127.0.0.1 ; **liste blanche** de fichiers servis ; en-têtes CSP, nosniff, no-referrer.
- Entrées du navigateur traitées comme non fiables : liste blanche des thèmes (propriétés propres), valeurs bornées, chaînes nettoyées avant d'entrer dans un prompt, contenu délimité et signalé au modèle comme « donnée ».
- Sortie du modèle normalisée : champs connus uniquement, longueurs bornées, texte de la charte imposé par le serveur, options mélangées, domaines réels refusés (seul utbm.fr est toléré, côté légitime).
- Limite de débit (10 requêtes/min), 2 générations simultanées, taille de requête limitée à 20 Ko.
- Affichage via échappement HTML systématique ; aucun style ni script inline (compatible CSP).

## Tests réalisés
Moteur (horloge simulée, J+1 / J+7), boucle générateur/critique avec backends truqués, sanitisation (injection via le profil), API (415, 400, 413, 429, traversée de chemin), interface complète sur un parcours de bout en bout (jsdom). Le test de la sanitisation a révélé une vraie faille (`"__proto__"` passait la liste blanche), corrigée.

## Limites connues (à discuter dans le rapport)
- Le test final réutilise des variantes vues pendant l'apprentissage. Pour une mesure rigoureuse, utiliser des scénarios générés jamais vus.
- Les données sont stockées dans le navigateur (localStorage) : pas de vue administrateur multi-utilisateurs.
- Le mode simulation n'est pas de l'IA : il sert à tester la chaîne.
- Non testé ici avec un vrai modèle (pas de clé) : les prompts sont à ajuster après les premiers essais réels.

## Feuille de route
1. État de l'art (ANSSI, Cybermalveillance.gouv.fr, serious games, efficacité des formations anti-phishing)
2. Conception pédagogique (niveaux, scénarios à étapes, personnalisation par métier)
3. Évaluation utilisateurs : 5 à 10 testeurs, test de niveau/final, avec et sans scénarios IA
4. Rapport et soutenance
