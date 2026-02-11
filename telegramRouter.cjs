/**
 * @file TelegramRouter.js
 * @version 1.0.0-CVNU
 * @description Bridge entre Telegram, Groq (Llama 3.1) et le Kernel CVNU
 */

const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');
const { CVNU_SYSTEM, KERNEL } = require('./docs/CORE_SYSTEM_CVNU.js');

// Initialisation des instances
const bot = new Telegraf('7387310603:AAEdSZ8DUY5O7Z0r9de_QkQlw9_aqYSQVbU', {
    telegram: {
      webhookReply: true,
    },
  });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * MODULE : ROUTAGE COGNITIF
 * Intercepte les messages, les valorise via l'AGI et met à jour le solde RUP.
 */
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    const userId = ctx.from.id;

    // 1. Détection de commande système
    if (userMessage.startsWith('/')) {
        const response = CVNU_SYSTEM.onCommandReceive(userMessage);
        return ctx.replyWithMarkdown(`\`\`\`\n${response}\n\`\`\``);
    }

    // 2. Traitement AGI (Llama 3.1-8b-instant)
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Tu es gemCVNU, Gouverneur Numérique. Analyse la valeur cognitive du message suivant." },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.1-8b-instant",
        });

        const agiResponse = completion.choices[0].message.content;

        // 3. Valorisation UTMi (Mining Cognitif)
        const wordCount = userMessage.split(/\s+/).length;
        const utmiGained = wordCount * 0.50; // 1 mot = 0.50€
        CVNU_SYSTEM.system.addCVNUPoints(utmiGained);

        // 4. Audit Fiscal Rapide
        const audit = CVNU_SYSTEM.system.processEarningsWithTax(utmiGained, "Interaction Telegram");

        // 5. Réponse unifiée
        const output = [
            agiResponse,
            "\n--- AUDIT CVNU ---",
            `💰 Valeur : +${utmiGained} UTMi`,
            `🏛️ Taxe IA (6.8%) : ${audit["Taxe AI (6.8%)"]}`,
            `📈 Nouveau Solde : ${audit["Solde Total"]}`,
            "-------------------"
        ].join('\n');

        ctx.reply(output);

    } catch (error) {
        ctx.reply("⚠️ Erreur de liaison AGI (Groq Cloud).");
    }
});

// Lancement du Bridge
bot.launch();
console.log("🚀 TelegramRouter CVNU : ONLINE");