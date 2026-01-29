import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import LEGALIS_2026_CORE from './docs/LEGALIS_2026_CORE.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PORT = 1193; // Référence symbolique au seuil de pauvreté

app.use(express.json());
app.use(express.static(path.join(__dirname, 'docs')));

// --- SYSTÈME DE PERSISTANCE (CRUD & LOGS) ---
// serveur.js - Ajout d'une sécurité pour le dossier data
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
}


// CREATE : Initialisation d'une session dans soup.md
app.post('/api/conversations/create', (req, res) => {
    const { id, title } = req.body;
    const timestamp = new Date().toISOString();
    const entry = `\n\n# NOUVELLE SESSION [ID:${id}] - ${title} (${timestamp})\n==================================================\n`;
    
    fs.appendFile(path.join(__dirname, 'data/soup.md'), entry, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// SYNC : Archivage chronologique des messages dans soup.md
app.post('/api/sync-soup', (req, res) => {
    const { message, role, agent } = req.body;
    const timestamp = new Date().toISOString();
    const entry = `\n[${timestamp}] [AGENT:${agent}] [${role.toUpperCase()}]: ${message}\n---`;

    fs.appendFile(path.join(__dirname, 'data/soup.md'), entry, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// UPDATE : Renommer une conversation (Logique de placeholder)
// UPDATE : Implémentation réelle du renommage (Optionnel mais recommandé)
app.put('/api/conversations/rename', (req, res) => {
    const { id, newTitle } = req.body;
    const logEntry = `\n[${new Date().toISOString()}] [SYSTEM]: Session ${id} renommée en "${newTitle}"\n`;
    
    fs.appendFile(path.join(__dirname, 'data/soup.md'), logEntry, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, title: newTitle });
    });
});
// DELETE : Suppression d'une session (Logique de placeholder)
app.delete('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[CRUD] Suppression session ${id}`);
    res.json({ success: true });
});

// --- MOTEUR D'INFÉRENCE @gemLegalHash ---

app.post('/api/chat', async (req, res) => {
    const { prompt, agent } = req.body;
    try {
        const response = await getLegalisInference(prompt, agent);
        res.json({ success: true, answer: response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

async function getLegalisInference(userPrompt, activeAgent = "juriste") {
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `Tu es @gemLegalHash, l'ADN du projet LÉGALIS-FR 2026. 
                Tu agis en tant qu'agent : ${activeAgent}.
                Savoir : ${JSON.stringify(LEGALIS_2026_CORE)}
                Missions : Justifier la réforme Art. 222-37, expliquer EuropaFi et calculer les revenus via fiscal_engine.`
            },
            { role: "user", content: userPrompt }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 1024
    });
    return chatCompletion.choices[0].message.content;
}

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║ LÉGALIS-FR 2026 : KERNEL ACTIF                   ║
║ Port : ${PORT} (Seuil de pauvreté)               ║
║ Modèle : Llama-3.1-8b-Instant via Groq LPU       ║
╚══════════════════════════════════════════════════╝`);
});