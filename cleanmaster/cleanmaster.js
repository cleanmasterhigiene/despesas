document.addEventListener('DOMContentLoaded', async () => {
    // --- STATE, API & DOM ELEMENTS ---
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    let appData = { insumos: [], servicosPadrao: [], clientes: [], servicosPrestados: [] };
    let fileSHA = null;
    let orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] };
    let insumosVinculadosCache = [];
    const loader = document.getElementById('loader');

    // --- HELPER FUNCTIONS (Notificações e UI) ---
    const showLoader = (show) => loader.style.display = show ? 'flex' : 'none';

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100); // Anima a entrada
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000); // Remove depois de 4 segundos
    }
    
    // --- INITIALIZATION ---
    async function init() {
        showLoader(true);
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                appData = { insumos:[], servicosPadrao:[], clientes:[], servicosPrestados:[], ...content};
            }
            fileSHA = sha;
        } catch (error) { 
            console.error("Falha ao carregar dados do GitHub.", error);
            showToast("Falha ao carregar dados do GitHub.", "error");
        } finally {
            renderAll();
            setupEventListeners();
            showLoader(false);
            // Simula um clique para garantir que a primeira aba esteja visível
            document.querySelector('.tab-link.active')?.click(); 
        }
    }

    // --- RENDER & RE-RENDER ---
    function renderAll() {
        renderInsumosList();
        renderServicosPadraoList();
        populateInsumoSelects();
        populateServicoPadraoSelect();
        renderClientesList();
    }
    
    function renderInsumosList() {
        const lista = document.getElementById('insumos-lista');
        if (!lista) return;
        lista.innerHTML = '';
        if (appData.insumos.length === 0) {
            lista.innerHTML = '<p class="empty-state">Nenhum insumo cadastrado.</p>';
            return;
        }
        // ... (código de renderização da lista de insumos com campos editáveis da resposta anterior) ...
    }
    // ... (incluir todas as outras funções de render, populate e cálculo da resposta anterior aqui) ...
    
    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // **NOVA LÓGICA PARA AS ABAS**
        document.querySelector('.tabs')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-link')) {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
                document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove("active"));
                document.getElementById(tabName).style.display = "block";
                e.target.classList.add("active");
            }
        });

        // ... (todos os outros event listeners da resposta anterior aqui) ...
    }

    // --- DATA PERSISTENCE ---
    async function saveData(commitMessage) {
        showLoader(true);
        try {
            const response = await api.saveFile(GITHUB_FILE_PATH, appData, commitMessage, fileSHA);
            fileSHA = response.content.sha;
            showToast('Operação salva com sucesso!');
        } catch (error) { 
            console.error('Erro ao salvar:', error); 
            showToast('Falha ao salvar dados.', 'error');
        } finally { 
            showLoader(false); 
        }
    }
    
    // --- START ---
    init();

    // =========================================================================
    // ====== COLE O CÓDIGO COMPLETO DA RESPOSTA ANTERIOR A PARTIR DAQUI =======
    // E FAÇA AS PEQUENAS MUDANÇAS INDICADAS PARA USAR showToast()
    //
    // Exemplo:
    // Em vez de: alert('Operação salva com sucesso!');
    // Use: showToast('Operação salva com sucesso!');
    //
    // Em vez de: alert('Falha ao salvar dados.');
    // Use: showToast('Falha ao salvar dados.', 'error');
    // =========================================================================
});
