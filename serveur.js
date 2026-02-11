import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import telegram from './telegramRouter.cjs';
// --- IMPORTATION DU NOYAU ET DES MOTEURS ÉCONOMIQUES ---
import { circularTaxEngine } from './docs/circular_tax_engine.js';
import CORE_SYSTEM_CVNU from './docs/CORE_SYSTEM_CVNU.js';
import { utmiCalculator } from './docs/utms_calculator.js';

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
    const { prompt, agent, context } = req.body;
    
    try {
        // Synthèse minimale pour rester sous la limite de 6000 tokens
        const systemPrompt = `Tu es gemCVNU. ADN: ${CORE_SYSTEM_CVNU.KERNEL.LAW_CODE.ARTICLES.L3121_1}. Rôle: ${agent}. RUP: 750-7500€. Sois concis.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 400 
        });

        const answer = chatCompletion.choices[0].message.content;

        // VALORISATION LOCALE (Évite l'erreur amount)
        const valuation = utmiCalculator.calculateUtmi({
            type: 'ai_response',
            data: { text: answer, wordCount: answer.split(' ').length }
        }, { userCvnuValue: context.userCvnuValue || 0.5 });

        const fiscalData = circularTaxEngine.calculateCircularTax(
            { utmi: valuation.utmi, estimatedCostUSD: valuation.estimatedCostUSD },
            { userCvnuValue: context.userCvnuValue || 0.5 }
        );

        // Sécurité : Fallback si fiscalData est mal formé
        const taxAmount = fiscalData ? fiscalData.amount : 0;

        // Archivage simplifié dans soup.md
        fs.appendFileSync(path.join(__dirname, 'data/soup.md'), `\n[TX] ${valuation.utmi} UTMi | NET: ${valuation.utmi - taxAmount}€\n`);

        res.json({ 
            success: true, 
            answer: answer,
            monetization: {
                utmi: valuation.utmi,
                netAmount: taxAmount // On renvoie la taxe pour l'affichage
            }
        });
        
    } catch (error) {
        console.error("ERREUR KERNEL:", error.message);
        res.status(500).json({ success: false, error: "Synchro Kernel interrompue." });
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