/**
 * MODULE: RUP_MANAGER.js
 * VERSION: 2.0.0 (Smart Contract Edition)
 * ROLE: Gestionnaire du Revenu Universel Progressif & Solvabilité
 * LIEN: Connecté au circular_tax_engine.js
 */

const RUP_CONFIG = {
    COEFF_LEVEL: 0.60, // 60% basé sur la compétence (CVNU Level)
    COEFF_TRUST: 0.40, // 40% basé sur la confiance (Social Score)
    MIN_FUND_THRESHOLD: 100.00, // Seuil de sécurité anti-liquidateur
    VERSION: "2.0-LIQUIDATOR_PROOF"
};

class RUPManager {

    constructor(config = {}) {
        this.fund_total = config.fund_total || 0;
        this.beneficiaries = []; // Liste des citoyens
        this.history = [];
        this.status = "ACTIVE";
    }

    /**
     * Enregistre un citoyen (Bénéficiaire du Smart Contract)
     * @param {Object} userCVNU - Objet contenant {level, neutrality_score, id}
     */
    registerBeneficiary(userCVNU) {
        // Normalisation des données entrantes
        const beneficiary = {
            id: userCVNU.id || `ANON_${Date.now()}`,
            level: Math.min(Math.max(userCVNU.level || 1, 1), 10), // Clamp 1-10
            trust: Math.min(Math.max(userCVNU.neutrality_score || 0.5, 0), 1) // Clamp 0-1
        };
        
        // Vérification doublon
        const exists = this.beneficiaries.find(b => b.id === beneficiary.id);
        if (!exists) {
            this.beneficiaries.push(beneficiary);
            return { status: "REGISTERED", id: beneficiary.id };
        }
        return { status: "ALREADY_REGISTERED", id: beneficiary.id };
    }

    /**
     * Alimente le fonds (Input fiscal)
     * Connecté à circular_tax_engine.js
     */
    feed(amount, source = "TAX_AI") {
        if (amount <= 0) return; // Pas de valeurs négatives
        
        this.fund_total += amount;
        
        // Log comptable immuable
        this.history.push({
            ts: new Date().toISOString(),
            type: "CREDIT",
            source: source,
            amount: parseFloat(amount.toFixed(2)),
            balance_after: parseFloat(this.fund_total.toFixed(2))
        });
    }

    /**
     * Calcule la Part (Share) individuelle
     * Formule : (Level/10 * 0.6) + (Trust * 0.4)
     */
    calculateShare(beneficiary) {
        const levelFactor = beneficiary.level / 10; // Normalisé 0.1 - 1.0
        const trustFactor = beneficiary.trust;      // Déjà 0.0 - 1.0
        
        // Application des coefficients directeurs
        const rawScore = (levelFactor * RUP_CONFIG.COEFF_LEVEL) + (trustFactor * RUP_CONFIG.COEFF_TRUST);
        return parseFloat(rawScore.toFixed(4));
    }

    /**
     * Vérification de Solvabilité (Le Garde-Fou Liquidateur)
     * Empêche la distribution si cela met la trésorerie en danger.
     */
    checkSolvency() {
        if (this.fund_total < RUP_CONFIG.MIN_FUND_THRESHOLD) {
            return { 
                safe: false, 
                reason: "FONDS_INSUFFISANTS", 
                alert: "RISQUE_LIQUIDATEUR_ELEVE" 
            };
        }
        return { safe: true, reason: "SOLVABLE" };
    }

    /**
     * Exécute la distribution (Le "Payday")
     */
    distribute() {
        // 1. Check Sécurité
        const solvency = this.checkSolvency();
        if (!solvency.safe) {
            console.warn(`[⛔ RUP BLOCKED] ${solvency.reason}`);
            return [];
        }

        // 2. Calcul du Poids Total
        const totalWeight = this.beneficiaries.reduce(
            (sum, b) => sum + this.calculateShare(b), 
            0
        );

        if (totalWeight === 0) return [];

        // 3. Distribution
        const distributionLog = this.beneficiaries.map(b => {
            const share = this.calculateShare(b);
            const ratio = share / totalWeight;
            const payout = Math.floor(this.fund_total * ratio * 100) / 100; // Arrondi centime inf

            return {
                id: b.id,
                level: b.level,
                trust: b.trust,
                share_score: share,
                payout_utmi: payout
            };
        });

        // 4. Reset du fonds (Optionnel: ou garder un fond de roulement)
        // Ici on distribue tout pour la circularité maximale
        const totalDistributed = distributionLog.reduce((acc, d) => acc + d.payout_utmi, 0);
        this.fund_total -= totalDistributed;

        // 5. Log Blockchain
        this.history.push({
            ts: new Date().toISOString(),
            type: "DISTRIBUTION",
            amount: totalDistributed,
            beneficiaries_count: distributionLog.length
        });

        return distributionLog;
    }

    /**
     * Audit JSON-LD pour RESILIA_AGI
     */
    audit() {
        return {
            "@context": "http://schema.org",
            "@type": "FinancialProduct",
            "name": "Fonds RUP Saint-Algo",
            "currency": "UTMi",
            "balance": this.fund_total, //
            "history_length": this.history.length,
            "config": RUP_CONFIG
        };
    }
}

// --- EXPORT COMPATIBLE (Node.js & Browser) ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RUPManager; // Pour require() dans RESILIA_AGI.js
}
if (typeof window !== 'undefined') {
    window.RUPManager = RUPManager; // Pour index.html
}