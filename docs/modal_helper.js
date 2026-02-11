/**
 * @file modal_helper.js
 * @description Version "Hard-Linked" pour garantir l'exécution du bouton Envoyer.
 */

class GemChatroom {
    constructor() {
        this.isOpen = false;
        this.currentConversationId = `SESS_${Date.now()}`;
        console.log("🚀 [gemCVNU] Initialisation de la Chatroom...");
        
        // On attend que le DOM soit chargé pour injecter l'UI
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initUI());
        } else {
            this.initUI();
        }
    }

    initUI() {
        console.log("📦 [gemCVNU] Injection de l'interface dans le DOM");
        
        // 1. Injection du HTML
        const modalHtml = `
            <div id="cvnu-modal" class="chatroom-modal" style="display:none; flex-direction:column; position:fixed; bottom:100px; right:30px; width:350px; height:450px; background:white; border:2px solid #000091; z-index:9999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <div class="chat-header" style="background:#000091; color:white; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold;">🏛️ gemCVNU Terminal</span>
                    <button id="close-chat" style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem;">✖</button>
                </div>
                <div id="chat-messages" class="chat-body" style="flex:1; padding:10px; overflow-y:auto; font-family:sans-serif; font-size:14px; background:#f9f9f9;">
                    <div class="system-msg" style="color:#666; font-style:italic;">Connexion au Kernel établie...</div>
                </div>
                <div class="chat-footer" style="padding:10px; border-top:1px solid #ddd; display:flex; gap:5px; background:white;">
                    <input type="text" id="chat-input" placeholder="Message..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <button id="send-btn" style="background:#000091; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Envoyer</button>
                </div>
                <div class="monetization-status" style="background:#27AE60; color:white; font-size:10px; text-align:center; padding:3px;">
                    UTMi Session: <span id="utmi-counter">0.00</span> €
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 2. Liaison des événements avec vérification
        const helpBtn = document.querySelector('.floating-btn');
        const sendBtn = document.getElementById('send-btn');
        const closeBtn = document.getElementById('close-chat');
        const inputField = document.getElementById('chat-input');

        if (helpBtn) helpBtn.onclick = () => this.toggleChat();
        if (closeBtn) closeBtn.onclick = () => this.toggleChat();
        
        // ACTION DU BOUTON ENVOYER
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                console.log("Click sur Envoyer détecté");
                this.sendMessage();
            });
        }

        if (inputField) {
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }

        this.createSessionOnServer();
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const modal = document.getElementById('cvnu-modal');
        modal.style.display = this.isOpen ? 'flex' : 'none';
        console.log("Chatroom status:", this.isOpen ? "Ouverte" : "Fermée");
    }

    async createSessionOnServer() {
        try {
            await fetch('/api/conversations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: this.currentConversationId, title: "Session Live" })
            });
        } catch (e) { console.error("Erreur Session Serveur:", e); }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        console.log("Envoi du message:", message);

        this.appendMessage('user', message);
        input.value = '';

        try {
            // Récupération dynamique du Kernel
            const core = window.CVNU || (window.KERNEL ? { STATE: window.KERNEL.STATE } : null);
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: message,
                    agent: "Gouverneur",
                    context: { 
                        level: core?.STATE?.USER_CVNU?.level || 1, 
                        userCvnuValue: core?.STATE?.USER_CVNU?.neutrality_score || 0.5 
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                this.appendMessage('assistant', data.answer);
                this.updateMonetizationUI(data.monetization);
            }
        } catch (error) {
            console.error("Erreur Fetch Chat:", error);
            this.appendMessage('system', "❌ Le serveur ne répond pas (Port 1193).");
        }
    }

    appendMessage(role, text) {
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = "10px";
        msgDiv.style.padding = "8px";
        msgDiv.style.borderRadius = "5px";
        
        if (role === 'user') {
            msgDiv.style.background = "#e1f5fe";
            msgDiv.style.marginLeft = "20px";
            msgDiv.innerHTML = `<strong>Vous:</strong> ${text}`;
        } else if (role === 'assistant') {
            msgDiv.style.background = "#fff3e0";
            msgDiv.style.marginRight = "20px";
            msgDiv.innerHTML = `<strong>gemCVNU:</strong> ${text}`;
        } else {
            msgDiv.style.textAlign = "center";
            msgDiv.style.fontSize = "11px";
            msgDiv.innerHTML = text;
        }
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    updateMonetizationUI(data) {
        const counter = document.getElementById('utmi-counter');
        const current = parseFloat(counter.innerText);
        counter.innerText = (current + data.utmi).toFixed(2);
        
        // Mise à jour visuelle du dashboard si présent
        if (window.CVNU && window.CVNU.system) {
            window.CVNU.system.addCVNUPoints(data.utmi);
        }
    }
}

// Lancement immédiat
window.chatroom = new GemChatroom();