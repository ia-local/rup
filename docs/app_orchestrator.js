/**
 * @file script.js
 * Pilotage de l'Index via le Kernel CVNU J17
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('dynamic-sidebar');
    const viewer = document.getElementById('dynamic-content');

    // 1. Définition des Actions du Défi 28 (Issues du slider)
    const sections = [
        { id: 'mining', title: 'Action 01', head: 'Mining Cognitif', content: 'Valorisation de votre CVNU.' },
        { id: 'fiscal', title: 'Action 02', head: 'Flux Blockchain', content: 'Indexation RIB & Taxe IA.' },
        { id: 'payday', title: 'Action 03', head: 'Déblocage RUP', content: 'Certification & Bulletin de Paie.' }
    ];

    // 2. Rendu de la Sidebar (Menu Dynamique)
    sidebar.innerHTML = sections.map((s, i) => `
        <button class="nav-btn ${i === 0 ? 'active' : ''}" data-target="${s.id}">
            <span>📊</span> ${s.title}
        </button>
    `).join('');

    // 3. Fonction d'affichage d'une Section (Slider intégré)
    function displaySection(id) {
        const data = sections.find(s => s.id === id);
        viewer.innerHTML = `
            <article class="content-section active">
                <section class="info-card">
                    <span class="step-number">${data.title}</span>
                    <h1>${data.head}</h1>
                    <p class="tagline">${data.content}</p>
                    <div class="chart-container" style="height:350px;">
                        <canvas id="canvas-${id}"></canvas>
                    </div>
                </section>
            </article>
        `;
        // Appel immédiat du moteur graphique du noyau
        renderCoreChart(id);
    }

    // 4. Initialisation
    displaySection('mining');

    // 5. Gestionnaire d'événements
    sidebar.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-btn');
        if (!btn) return;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displaySection(btn.dataset.target);
    });
});

function renderCoreChart(id) {
    const ctx = document.getElementById(`canvas-${id}`).getContext('2d');
    // Ici on réutilise vos configurations Chart.js déjà validées
    const configs = {
        mining: { type: 'radar', data: { labels: ['Stratégie', 'Analyse', 'Code'], datasets: [{ data: [80, 90, 70], borderColor: '#000091' }] }},
        fiscal: { type: 'doughnut', data: { labels: ['Taxe', 'RUP'], datasets: [{ data: [6.8, 93.2], backgroundColor: ['#E1000F', '#27AE60'] }] }},
        payday: { type: 'line', data: { labels: ['J1', 'J14', 'J28'], datasets: [{ data: [750, 2500, 7500], borderColor: '#27AE60' }] }}
    };
    new Chart(ctx, configs[id]);
}