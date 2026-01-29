document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('dynamic-sidebar');
    const contentContainer = document.getElementById('dynamic-content');
    
    // 1. Détection automatique de la page courante
    // Récupère le nom du fichier (ex: "economie.html") ou met "index" par défaut
    let currentPage = window.location.pathname.split("/").pop().replace(".html", "");
    if (currentPage === "" || currentPage === "index") currentPage = "index";
    
    // Cas spécifique pour le routage local simple
    if (!["index", "economie", "cvnu", "rup"].includes(currentPage)) currentPage = "index";

    console.log("Chargement de la configuration pour la page :", currentPage);

    fetch('database.json')
        .then(response => response.json())
        .then(fullData => {
            // 2. On cible uniquement les données de la page courante
            const pageData = fullData[currentPage];

            if (pageData) {
                if(pageData.page_title) document.title = pageData.page_title;
                initDashboard(pageData.sections);
            } else {
                console.error("Aucune donnée trouvée pour cette page dans database.json");
                contentContainer.innerHTML = "<p style='padding:2rem'>Contenu en cours de rédaction...</p>";
            }
        })
        .catch(error => console.error('Erreur chargement DB:', error));

    function initDashboard(sections) {
        sidebar.innerHTML = '';
        contentContainer.innerHTML = '';

        sections.forEach((section, index) => {
            // Création du menu latéral
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            
            // Icônes
            let icon = '📄';
            if (section.type === 'hero') icon = '🏛️';
            if (section.type === 'chart_section') icon = '📊';
            
            btn.innerHTML = `<span>${icon}</span> ${section.title}`;
            btn.dataset.target = section.id;
            
            if (index === 0) btn.classList.add('active');
            
            btn.addEventListener('click', () => {
                switchSection(section.id);
                // Si graphique, on le dessine au clic pour s'assurer qu'il a la bonne taille
                if(section.type === 'chart_section') renderChart(section);
            });
            sidebar.appendChild(btn);

            // Création du contenu principal
            const article = document.createElement('article');
            article.id = section.id;
            article.className = `content-section ${index === 0 ? 'active' : ''}`;

            let quoteBlock = section.citation ? `
                <blockquote class="law-quote">
                    ${section.citation.text}
                    <cite>${section.citation.source}</cite>
                </blockquote>` : '';

            // Templates HTML selon le type
            if (section.type === 'hero') {
                article.innerHTML = `
                    <header class="hero-section">
                        <h1>${section.heading}</h1>
                        <p class="tagline">${section.content}</p>
                    </header>`;
            } else if (section.type === 'chart_section') {
                article.innerHTML = `
                    <section class="info-card">
                        <h2>${section.heading}</h2>
                        <div class="card-body">${section.content}</div>
                        <div class="chart-container" style="position: relative; height:300px; width:100%; margin-top:2rem;">
                            <canvas id="chart-${section.id}"></canvas>
                        </div>
                        ${quoteBlock}
                    </section>`;
            } else {
                article.innerHTML = `
                    <section class="info-card">
                        <h2>${section.heading}</h2>
                        <div class="card-body">${section.content}</div>
                        ${quoteBlock}
                    </section>`;
            }
            contentContainer.appendChild(article);
            
            // Initialisation graphique au chargement si c'est la section active
            if (index === 0 && section.type === 'chart_section') {
                setTimeout(() => renderChart(section), 100);
            }
        });
    }

    function renderChart(section) {
        const canvasId = `chart-${section.id}`;
        const ctx = document.getElementById(canvasId);
        
        if (!ctx) return;

        // Destruction propre de l'instance précédente pour éviter les bugs d'affichage
        const existingChart = Chart.getChart(canvasId);
        if (existingChart) {
            existingChart.destroy();
        }

        new Chart(ctx, section.chartConfig);
    }

    function switchSection(id) {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active');
            if(b.dataset.target === id) b.classList.add('active');
        });

        document.querySelectorAll('.content-section').forEach(s => {
            s.classList.remove('active');
            if(s.id === id) s.classList.add('active');
        });
    }
});