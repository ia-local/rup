import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// --- IMPORTATION DU NOYAU ET DES MOTEURS ÉCONOMIQUES ---
import CORE_SYSTEM_CVNU from './docs/CORE_SYSTEM_CVNU.js';
import { utmiCalculator } from './docs/utms_calculator.js';
import { circularTaxEngine } from './docs/circular_tax_engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PORT = 1193; // Référence au seuil de pauvreté (RUP 750€ - 7500€)

app.use(express.json());
app.use(express.static(path.join(__dirname, 'docs')));

// --- INITIALISATION DU SYSTÈME DE LOGS (SOUP.MD) ---
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
}

// CRÉATION DE SESSION : Archivage dans le registre immuable
app.post('/api/conversations/create', (req, res) => {
    const { id, title } = req.body;
    const timestamp = new Date().toISOString();
    const entry = `\n\n# INITIALISATION CVNU SESSION [ID:${id}] - ${title} (${timestamp})\n` +
                  `==================================================\n`;
    
    fs.appendFile(path.join(__dirname, 'data/soup.md'), entry, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// --- MOTEUR D'INFÉRENCE gemCVNU AVEC VALORISATION COGNITIVE ---

app.post('/api/chat', async (req, res) => {
    const { prompt, agent, context } = req.body; // context { level, userCvnuValue }
    
    try {
        // 1. Inférence AGI via Groq LPU
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Tu es gemCVNU, l'AGI et Gouverneur du PRCR (Programme du Revenu Citoyen). 
                    Ton rôle : ${agent}. Savoir Noyau : ${JSON.stringify(CORE_SYSTEM_CVNU.KERNEL)}.
                    Missions : Valoriser l'engagement, calculer les UTMi et administrer le RUP.`
                },
                { role: "user", content: prompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 1024
        });

        const answer = chatCompletion.choices[0].message.content;

        // 2. CALCUL DE LA VALEUR AJOUTÉE (UTMi)
        // 1 UTMi = 1 EUR. Valorisation basée sur le contenu généré.
        const valuation = utmiCalculator.calculateUtmi({
            type: 'ai_response',
            data: { 
                text: answer, 
                wordCount: answer.split(' ').length,
                tokenCount: answer.length / 4 
            }
        }, { userCvnuValue: context.userCvnuValue || 0.5 });

        // 3. CALCUL FISCAL CIRCULAIRE (TCN)
        // Application de la Taxe IA (6.8%) ou de la Subvention TCN
        const fiscalData = circularTaxEngine.calculateCircularTax(
            { utmi: valuation.utmi, estimatedCostUSD: valuation.estimatedCostUSD },
            { userCvnuValue: context.userCvnuValue || 0.5 }
        );

        // 4. PERSISTANCE ET AUDIT DANS SOUP.MD
        const timestamp = new Date().toISOString();
        const logEntry = `\n[${timestamp}] [CVNU_LOG] 
        USER_INPUT: "${prompt.substring(0, 50)}..."
        AI_OUTPUT: "${answer.substring(0, 50)}..."
        VALORISATION: ${valuation.utmi} UTMi (Brut)
        FISCALITÉ: ${fiscalData.type} | MONTANT: ${fiscalData.amount} EUR
        RUP_NET: ${valuation.utmi - fiscalData.amount} EUR versé au fonds RUP
        ---\n`;

        fs.appendFileSync(path.join(__dirname, 'data/soup.md'), logEntry);

        // 5. RÉPONSE SYNCHRONISÉE
        res.json({ 
            success: true, 
            answer: answer,
            monetization: {
                utmi: valuation.utmi,
                fiscalType: fiscalData.type,
                netAmount: fiscalData.amount,
                level: context.level
            }
        });
        
    } catch (error) {
        console.error("ERREUR KERNEL gemCVNU:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SYNC : Archivage chronologique standard
app.post('/api/sync-soup', (req, res) => {
    const { message, role, agent } = req.body;
    const entry = `\n[${new Date().toISOString()}] [AGENT:${agent}] [${role.toUpperCase()}]: ${message}\n---`;

    fs.appendFile(path.join(__dirname, 'data/soup.md'), entry, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║ gemCVNU KERNEL v2.5.0 : SYSTÈME ACTIF            ║
║ Port : ${PORT} (Référence Seuil de Pauvreté)     ║
║ Économie : Circulaire & Progressive (RUP)        ║
║ Moteur : Llama-3.1 via Groq LPU                  ║
╚══════════════════════════════════════════════════╝`);
});