document.addEventListener('DOMContentLoaded', async () => {
    // --- STATE, API & DOM ELEMENTS ---
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    let appData = { insumos: [], servicosPadrao: [], clientes: [], servicosPrestados: [] };
    let fileSHA = null;
    let orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] };
    let insumosVinculadosCache = [];
    const loader = document.getElementById('loader');

    // --- INITIALIZATION ---
    async function init() {
        showLoader(true);
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                appData = { insumos:[], servicosPadrao:[], clientes:[], servicosPrestados:[], ...content};
            }
            fileSHA = sha;
        } catch (error) { console.error("Falha ao carregar dados do GitHub.", error);
        } finally {
            renderAll();
            showLoader(false);
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
        if(!lista) return;
        lista.innerHTML = '';
        appData.insumos.forEach(insumo => {
            const item = document.createElement('div');
            item.className = 'insumo-item';
            item.dataset.id = insumo.id;
            // NOVA ESTRUTURA COM CAMPOS EDITÁVEIS
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

    function renderServicosPadraoList() { /* ...código da resposta anterior... */ }
    function populateInsumoSelects() { /* ...código da resposta anterior... */ }
    function populateServicoPadraoSelect() { /* ...código da resposta anterior... */ }
    function renderClientesList(filter = '') { /* ...código da resposta anterior... */ }
    function renderOrcamentoAtual() { /* ...código da resposta anterior... */ }
    
    // --- CÁLCULOS ---
    function calcularCustoTotalServicoPadrao(servicoPadrao) { /* ...código da resposta anterior... */ }
    function updateOrcamentoTotal() { /* ...código da resposta anterior... */ }

    // --- EVENT HANDLERS ---
    window.openTab = (evt, tabName) => { /* ...código da resposta anterior... */ };

    // ORÇAMENTO
    document.getElementById('cliente-search')?.addEventListener('input', (e) => { /* ...código da resposta anterior... */ });
    document.getElementById('cliente-select')?.addEventListener('change', (e) => { /* ...código da resposta anterior... */ });
    document.getElementById('show-new-client-btn')?.addEventListener('click', () => { /* ...código da resposta anterior... */ });
    document.getElementById('add-servico-orcamento-btn')?.addEventListener('click', () => { /* ...código da resposta anterior... */ });
    document.getElementById('orcamento-itens-lista')?.addEventListener('click', (e) => { /* ...código da resposta anterior... */ });
    document.getElementById('orcamento-itens-lista')?.addEventListener('input', (e) => { /* ...código da resposta anterior... */ });
    document.getElementById('orcamento-form')?.addEventListener('submit', async (e) => { /* ...código da resposta anterior... */ });

    // CLIENTES
    document.getElementById('clientes-filter-input')?.addEventListener('input', (e) => renderClientesList(e.target.value));
    document.getElementById('clientes-lista')?.addEventListener('click', (e) => { /* ...código da resposta anterior... */ });

    // === INÍCIO DO CÓDIGO CORRIGIDO E NOVO ===

    // INSUMOS - CADASTRO
    document.getElementById('insumo-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('insumo-nome').value;
        const precoTotal = parseFloat(document.getElementById('insumo-preco-total').value);
        const quantidadeTotal = parseFloat(document.getElementById('insumo-qtd-total').value);
        const unidadeMedida = document.getElementById('insumo-unidade').value;

        if (!nome || !precoTotal || !quantidadeTotal || !unidadeMedida) {
            alert('Por favor, preencha todos os campos do insumo.');
            return;
        }

        const novoInsumo = {
            id: Date.now(),
            nome,
            precoTotal,
            quantidadeTotal,
            unidadeMedida,
            custoPorUnidade: precoTotal / quantidadeTotal
        };

        appData.insumos.push(novoInsumo);
        await saveData(`Cadastrado novo insumo: ${nome}`);
        e.target.reset();
        renderInsumosList();
        populateInsumoSelects();
    });
    
    // INSUMOS - EDIÇÃO RÁPIDA E EXCLUSÃO
    document.getElementById('insumos-lista')?.addEventListener('change', async (e) => {
        if (e.target.classList.contains('insumo-preco-edit') || e.target.classList.contains('insumo-qtd-edit')) {
            const itemDiv = e.target.closest('.insumo-item');
            const insumoId = parseInt(itemDiv.dataset.id);
            const insumo = appData.insumos.find(i => i.id === insumoId);

            if (insumo) {
                insumo.precoTotal = parseFloat(itemDiv.querySelector('.insumo-preco-edit').value);
                insumo.quantidadeTotal = parseFloat(itemDiv.querySelector('.insumo-qtd-edit').value);
                insumo.custoPorUnidade = insumo.precoTotal / insumo.quantidadeTotal;
                
                await saveData(`Atualizado insumo: ${insumo.nome}`);
                renderInsumosList(); // Re-renderiza para atualizar o custo calculado
                populateInsumoSelects(); // Atualiza os dropdowns em outras abas
            }
        }
    });

    document.getElementById('insumos-lista')?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            if (!confirm('Tem certeza que deseja excluir este insumo?')) return;
            const insumoId = parseInt(e.target.dataset.id);
            appData.insumos = appData.insumos.filter(i => i.id !== insumoId);
            await saveData(`Excluído insumo ID: ${insumoId}`);
            renderInsumosList();
            populateInsumoSelects();
        }
    });

    // SERVIÇOS - CADASTRO
    document.getElementById('sp-add-insumo-btn')?.addEventListener('click', () => {
        const insumoId = document.getElementById('sp-insumo-select').value;
        const quantidade = parseFloat(document.getElementById('sp-insumo-quantidade').value);
        if (!insumoId || !quantidade) return;
        
        if (!insumosVinculadosCache.some(i => i.insumoId == insumoId)) {
            insumosVinculadosCache.push({ insumoId: parseInt(insumoId), quantidade });
            renderInsumosVinculados();
        }
    });
    
    document.getElementById('sp-insumos-container')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const insumoIdToRemove = parseInt(e.target.dataset.insumoId);
            insumosVinculadosCache = insumosVinculadosCache.filter(i => i.insumoId !== insumoIdToRemove);
            renderInsumosVinculados();
        }
    });
    
    document.getElementById('servico-padrao-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoServico = {
            id: Date.now(),
            nome: document.getElementById('sp-nome').value,
            custoMaoDeObra: parseFloat(document.getElementById('sp-mao-de-obra').value) || 0,
            custoImposto: parseFloat(document.getElementById('sp-imposto').value) || 0,
            tempoEstimado: parseInt(document.getElementById('sp-tempo').value) || 0,
            insumosVinculados: insumosVinculadosCache
        };
        appData.servicosPadrao.push(novoServico);
        await saveData(`Criado modelo de serviço: ${novoServico.nome}`);
        e.target.reset();
        insumosVinculadosCache = [];
        renderInsumosVinculados();
        renderServicosPadraoList();
        populateServicoPadraoSelect();
    });
    
    // SERVIÇOS - EXCLUSÃO
    document.getElementById('servicos-padrao-lista')?.addEventListener('click', async (e) => {
         if (e.target.classList.contains('delete-btn')) {
            if (!confirm('Tem certeza que deseja excluir este modelo de serviço?')) return;
            const servicoId = parseInt(e.target.dataset.id);
            appData.servicosPadrao = appData.servicosPadrao.filter(sp => sp.id !== servicoId);
            await saveData(`Excluído modelo de serviço ID: ${servicoId}`);
            renderServicosPadraoList();
            populateServicoPadraoSelect();
        }
    });

    // === FIM DO CÓDIGO CORRIGIDO E NOVO ===
    
    // --- FUNÇÕES QUE JÁ ESTAVAM FUNCIONANDO ---
    // (O código que você já tinha e estava ok)
    function renderInsumosVinculados() { /* ...código da resposta anterior... */ }

    // --- DATA PERSISTENCE ---
    async function saveData(commitMessage) {
        showLoader(true);
        try {
            const response = await api.saveFile(GITHUB_FILE_PATH, appData, commitMessage, fileSHA);
            fileSHA = response.content.sha;
            alert('Operação salva com sucesso!');
        } catch (error) { 
            console.error('Erro ao salvar:', error); 
            alert('Falha ao salvar dados.');
        } finally { 
            showLoader(false); 
        }
    }

    // --- START ---
    init();
});
