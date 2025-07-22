document.addEventListener('DOMContentLoaded', async () => {
    // --- ESTADO GLOBAL ---
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    let appData = { insumos: [], servicosPadrao: [], servicosPrestados: [] };
    let fileSHA = null;
    let insumosVinculadosCache = []; // Cache para insumos ao criar/editar um serviço padrão

    // --- INICIALIZAÇÃO ---
    async function init() {
        showLoader(true);
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) appData = { ...{insumos:[], servicosPadrao:[], servicosPrestados:[]}, ...content};
            fileSHA = sha;
        } catch (error) {
            console.error("Falha ao carregar dados.", error);
        } finally {
            populateInsumoSelects();
            populateServicoPadraoSelect();
            renderInsumosList();
            renderServicosPadraoList();
            showLoader(false);
            document.querySelector('.tab-link.active').click();
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    const showLoader = (show) => document.getElementById('loader').style.display = show ? 'flex' : 'none';
    window.openTab = (evt, tabName) => {
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
        document.querySelectorAll('.tab-link').forEach(tl => tl.className = tl.className.replace(" active", ""));
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    };

    function populateInsumoSelects() {
        const selects = [document.getElementById('sp-insumo-select')];
        selects.forEach(select => {
            select.innerHTML = '<option value="">Selecione um insumo</option>';
            appData.insumos.forEach(insumo => {
                const option = document.createElement('option');
                option.value = insumo.id;
                option.textContent = `${insumo.nome} (R$${insumo.custoPorUnidade.toFixed(2)}/${insumo.unidadeMedida})`;
                select.appendChild(option);
            });
        });
    }

    function populateServicoPadraoSelect() {
        const select = document.getElementById('lancamento-servico-select');
        select.innerHTML = '<option value="">-- Escolha um serviço --</option>';
        appData.servicosPadrao.forEach(sp => {
            const option = document.createElement('option');
            option.value = sp.id;
            option.textContent = sp.nome;
            select.appendChild(option);
        });
    }
    
    function renderInsumosList() {
        const lista = document.getElementById('insumos-lista');
        lista.innerHTML = '';
        appData.insumos.forEach(insumo => {
            const item = document.createElement('div');
            item.className = 'insumo-item';
            item.innerHTML = `<div class="item-info"><div class="nome">${insumo.nome}</div><div class="custo">Custo: R$ ${insumo.custoPorUnidade.toFixed(2)} por ${insumo.unidadeMedida}</div></div><button type="button" class="delete-btn" data-id="${insumo.id}">&times;</button>`;
            lista.appendChild(item);
        });
    }

    function renderServicosPadraoList() {
        const lista = document.getElementById('servicos-padrao-lista');
        lista.innerHTML = '';
        appData.servicosPadrao.forEach(sp => {
            const custoTotal = calcularCustoTotalServicoPadrao(sp);
            const item = document.createElement('div');
            item.className = 'servico-padrao-item';
            item.innerHTML = `<div class="item-info"><div class="nome">${sp.nome}</div><div class="custo">Custo Base: R$ ${custoTotal.toFixed(2)}</div></div><button type="button" class="delete-btn" data-id="${sp.id}">&times;</button>`;
            lista.appendChild(item);
        });
    }

    function renderInsumosVinculados() {
        const container = document.getElementById('sp-insumos-container');
        container.innerHTML = '';
        insumosVinculadosCache.forEach(item => {
            const insumoData = appData.insumos.find(i => i.id == item.insumoId);
            const div = document.createElement('div');
            div.className = 'item-vinculado';
            div.innerHTML = `<span>${item.quantidade} ${insumoData.unidadeMedida} de ${insumoData.nome}</span><button type="button" class="delete-btn" data-insumo-id="${item.insumoId}">&times;</button>`;
            container.appendChild(div);
        });
    }

    // --- FUNÇÕES DE CÁLCULO ---
    function calcularCustoTotalServicoPadrao(servicoPadrao) {
        let custo = (servicoPadrao.custoMaoDeObra || 0) + (servicoPadrao.custoImposto || 0);
        servicoPadrao.insumosVinculados.forEach(itemVinculado => {
            const insumo = appData.insumos.find(i => i.id == itemVinculado.insumoId);
            if (insumo) {
                custo += insumo.custoPorUnidade * itemVinculado.quantidade;
            }
        });
        return custo;
    }

    function updateLancamentoResumo() {
        const servicoId = document.getElementById('lancamento-servico-select').value;
        const resumoDiv = document.getElementById('lancamento-resumo');
        if (!servicoId) {
            resumoDiv.classList.add('hidden');
            return;
        }
        
        const servico = appData.servicosPadrao.find(sp => sp.id == servicoId);
        const custoTotal = calcularCustoTotalServicoPadrao(servico);
        
        document.getElementById('lancamento-custo-total').textContent = `R$ ${custoTotal.toFixed(2)}`;
        
        const precoCobrado = parseFloat(document.getElementById('lancamento-preco-cobrado').value) || 0;
        const lucro = precoCobrado - custoTotal;
        document.getElementById('lancamento-lucro-liquido').textContent = `R$ ${lucro.toFixed(2)}`;

        resumoDiv.classList.remove('hidden');
    }

    // --- EVENT HANDLERS ---
    // Cadastro de Insumos
    document.getElementById('insumo-form').addEventListener('submit', async (e) => { e.preventDefault(); /* ...código anterior... */ });

    // Cadastro de Serviço Padrão
    document.getElementById('sp-add-insumo-btn').addEventListener('click', () => {
        const insumoId = document.getElementById('sp-insumo-select').value;
        const quantidade = parseFloat(document.getElementById('sp-insumo-quantidade').value);
        if (!insumoId || !quantidade) return;
        
        if (!insumosVinculadosCache.some(i => i.insumoId == insumoId)) {
            insumosVinculadosCache.push({ insumoId: parseInt(insumoId), quantidade });
            renderInsumosVinculados();
        }
    });

    document.getElementById('sp-insumos-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const insumoIdToRemove = parseInt(e.target.dataset.insumoId);
            insumosVinculadosCache = insumosVinculadosCache.filter(i => i.insumoId !== insumoIdToRemove);
            renderInsumosVinculados();
        }
    });

    document.getElementById('servico-padrao-form').addEventListener('submit', async (e) => {
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

    // Lançamento de Serviço
    document.getElementById('lancamento-servico-select').addEventListener('change', updateLancamentoResumo);
    document.getElementById('lancamento-preco-cobrado').addEventListener('input', updateLancamentoResumo);
    
    document.getElementById('lancamento-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const servicoId = document.getElementById('lancamento-servico-select').value;
        const servicoModelo = appData.servicosPadrao.find(sp => sp.id == servicoId);
        const custoTotal = calcularCustoTotalServicoPadrao(servicoModelo);
        const precoCobrado = parseFloat(document.getElementById('lancamento-preco-cobrado').value);

        const servicoPrestado = {
            id: Date.now(),
            data: document.getElementById('lancamento-data').value,
            cliente: document.getElementById('lancamento-cliente').value,
            servicoPadraoId: servicoModelo.id,
            nomeServico: servicoModelo.nome,
            precoCobrado,
            custoTotal,
            lucro: precoCobrado - custoTotal
        };
        appData.servicosPrestados.push(servicoPrestado);
        await saveData(`Lançado serviço para ${servicoPrestado.cliente}`);
        e.target.reset();
        document.getElementById('lancamento-resumo').classList.add('hidden');
    });

    // --- PERSISTÊNCIA DE DADOS ---
    async function saveData(commitMessage) { /* ...código anterior... */ }

    init();
});
