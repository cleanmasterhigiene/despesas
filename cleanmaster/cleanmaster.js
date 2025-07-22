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
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 4000);
    }

    // --- INITIALIZATION ---
    async function init() {
        showLoader(true);
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                appData = { insumos: [], servicosPadrao: [], clientes: [], servicosPrestados: [], ...content };
            }
            fileSHA = sha;
        } catch (error) {
            console.error("Falha ao carregar dados do GitHub.", error);
            showToast("Falha ao carregar dados do GitHub.", "error");
        } finally {
            renderAll();
            setupEventListeners();
            showLoader(false);
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
        appData.insumos.forEach(insumo => {
            const item = document.createElement('div');
            item.className = 'insumo-item';
            item.dataset.id = insumo.id;
            item.innerHTML = `
                <span class="nome">${insumo.nome}</span>
                <div class="editable-fields">
                    <span>R$</span>
                    <input type="number" class="insumo-preco-edit" value="${insumo.precoTotal.toFixed(2)}" step="0.01">
                    <span>/</span>
                    <input type="number" class="insumo-qtd-edit" value="${insumo.quantidadeTotal}" step="0.01">
                    <span>${insumo.unidadeMedida}</span>
                </div>
                <div class="insumo-custo-calculado">
                    Custo: R$ ${insumo.custoPorUnidade.toFixed(2)}/${insumo.unidadeMedida}
                </div>
                <button type="button" class="delete-btn" data-id="${insumo.id}">&times;</button>
            `;
            lista.appendChild(item);
        });
    }

    function renderServicosPadraoList() {
        const lista = document.getElementById('servicos-padrao-lista');
        if (!lista) return;
        lista.innerHTML = '';
        if (appData.servicosPadrao.length === 0) {
            lista.innerHTML = '<p class="empty-state">Nenhum modelo de serviço cadastrado.</p>';
            return;
        }
        appData.servicosPadrao.forEach(sp => {
            const custoTotal = calcularCustoTotalServicoPadrao(sp);
            const item = document.createElement('div');
            item.className = 'servico-padrao-item';
            item.innerHTML = `<div class="item-info"><div class="nome">${sp.nome}</div><div class="custo">Custo Base: R$ ${custoTotal.toFixed(2)}</div></div><button type="button" class="delete-btn" data-id="${sp.id}">&times;</button>`;
            lista.appendChild(item);
        });
    }
    
    // ... (outras funções de render, populate e cálculo da resposta anterior) ...
    
    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // Nova Lógica para Abas
        document.querySelector('.tabs')?.addEventListener('click', (e) => {
            if (e.target.matches('.tab-link')) {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
                document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove("active"));
                document.getElementById(tabName).style.display = "block";
                e.target.classList.add("active");
            }
        });

        // Event Listeners dos Formulários e Botões
        // (Todos os event listeners da resposta anterior, agora dentro desta função)
    }

    // ... (código completo de todos os seus event handlers aqui) ...

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
    
    init();
});
