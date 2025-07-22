document.addEventListener('DOMContentLoaded', async () => {
    // --- ELEMENTOS GLOBAIS ---
    const loader = document.getElementById('loader');
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';

    // --- ESTADO DA APLICAÇÃO ---
    let appData = { insumos: [], servicosPrestados: [] };
    let fileSHA = null;
    let insumosUsadosNoServico = []; // Array temporário para o serviço atual

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    const showLoader = (show) => loader.style.display = show ? 'flex' : 'none';
    
    window.openTab = (evt, tabName) => {
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
        document.querySelectorAll('.tab-link').forEach(tl => tl.className = tl.className.replace(" active", ""));
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
        document.querySelector('.tab-link.active').click(); // Garante que a primeira aba seja exibida
    };

    function renderInsumosList() {
        const lista = document.getElementById('insumos-lista');
        const select = document.getElementById('insumo-select');
        lista.innerHTML = '';
        select.innerHTML = '<option value="">Selecione um insumo</option>';
        
        appData.insumos.forEach(insumo => {
            // Renderiza na lista de cadastrados
            const item = document.createElement('div');
            item.className = 'insumo-item';
            item.innerHTML = `
                <div class="insumo-info">
                    <div class="nome">${insumo.nome}</div>
                    <div class="custo">Custo: R$ ${insumo.custoPorUnidade.toFixed(2)} por ${insumo.unidadeMedida}</div>
                </div>
                <button type="button" class="delete-btn" data-id="${insumo.id}">&times;</button>
            `;
            lista.appendChild(item);
            
            // Popula o select para adicionar no serviço
            const option = document.createElement('option');
            option.value = insumo.id;
            option.textContent = insumo.nome;
            select.appendChild(option);
        });
    }

    function renderInsumosUsados() {
        const container = document.getElementById('insumos-usados-container');
        container.innerHTML = '';
        let custoTotal = 0;
        
        insumosUsadosNoServico.forEach(item => {
            const template = document.getElementById('insumo-usado-template');
            const clone = template.content.cloneNode(true);
            const insumoData = appData.insumos.find(i => i.id == item.insumoId);
            
            clone.querySelector('span').textContent = `${item.quantidade} ${insumoData.unidadeMedida} de ${insumoData.nome} (Custo: R$ ${item.custo.toFixed(2)})`;
            clone.querySelector('.delete-btn').dataset.id = item.tempId;
            container.appendChild(clone);
            custoTotal += item.custo;
        });
        
        document.getElementById('servico-custo-total').textContent = `R$ ${custoTotal.toFixed(2)}`;
        updateLucro();
    }

    // --- FUNÇÕES DE CÁLCULO ---
    function updateLucro() {
        const precoCobrado = parseFloat(document.getElementById('servico-preco-cobrado').value) || 0;
        const custoTotal = insumosUsadosNoServico.reduce((acc, item) => acc + item.custo, 0);
        const lucro = precoCobrado - custoTotal;
        document.getElementById('servico-lucro-liquido').textContent = `R$ ${lucro.toFixed(2)}`;
    }

    // --- EVENT HANDLERS ---
    document.getElementById('insumo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('insumo-nome').value;
        const precoTotal = parseFloat(document.getElementById('insumo-preco-total').value);
        const quantidadeTotal = parseFloat(document.getElementById('insumo-qtd-total').value);
        const unidadeMedida = document.getElementById('insumo-unidade').value;

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
    });
    
    document.getElementById('add-insumo-btn').addEventListener('click', () => {
        const insumoId = document.getElementById('insumo-select').value;
        const quantidade = parseFloat(document.getElementById('insumo-quantidade').value);

        if (!insumoId || !quantidade || quantidade <= 0) {
            alert('Selecione um insumo e informe uma quantidade válida.');
            return;
        }

        const insumo = appData.insumos.find(i => i.id == insumoId);
        const custoItem = insumo.custoPorUnidade * quantidade;
        
        insumosUsadosNoServico.push({
            tempId: Date.now(), // ID temporário para remoção da UI
            insumoId: insumo.id,
            quantidade: quantidade,
            custo: custoItem
        });
        
        renderInsumosUsados();
        document.getElementById('insumo-quantidade').value = '';
    });
    
    document.getElementById('insumos-usados-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const tempIdToRemove = parseInt(e.target.dataset.id);
            insumosUsadosNoServico = insumosUsadosNoServico.filter(i => i.tempId !== tempIdToRemove);
            renderInsumosUsados();
        }
    });
    
    document.getElementById('servico-preco-cobrado').addEventListener('input', updateLucro);

    document.getElementById('servico-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const custoTotal = insumosUsadosNoServico.reduce((acc, item) => acc + item.custo, 0);
        const precoCobrado = parseFloat(document.getElementById('servico-preco-cobrado').value);
        
        if (precoCobrado < custoTotal) {
            if (!confirm(`Atenção! O preço cobrado (R$${precoCobrado.toFixed(2)}) é menor que o custo (R$${custoTotal.toFixed(2)}), resultando em prejuízo. Deseja continuar?`)) {
                return;
            }
        }
        
        const novoServico = {
            id: Date.now(),
            data: document.getElementById('servico-data').value,
            cliente: document.getElementById('servico-cliente').value,
            descricao: document.getElementById('servico-descricao').value,
            precoCobrado: precoCobrado,
            custoTotalInsumos: custoTotal,
            lucro: precoCobrado - custoTotal,
            insumosUsados: insumosUsadosNoServico.map(({ tempId, ...rest }) => rest) // Remove o tempId
        };
        
        appData.servicosPrestados.push(novoServico);
        await saveData(`Serviço para ${novoServico.cliente} finalizado.`);
        e.target.reset();
        insumosUsadosNoServico = [];
        renderInsumosUsados();
    });

    // --- PERSISTÊNCIA DE DADOS ---
    async function saveData(commitMessage) {
        showLoader(true);
        try {
            const response = await api.saveFile(GITHUB_FILE_PATH, appData, commitMessage, fileSHA);
            fileSHA = response.content.sha;
            alert('Operação salva com sucesso no GitHub!');
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            alert('Falha ao salvar. Verifique o console para detalhes.');
        } finally {
            showLoader(false);
        }
    }

    // --- INICIALIZAÇÃO ---
    async function init() {
        showLoader(true);
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                appData = content;
                fileSHA = sha;
            }
        } catch (error) {
            console.error("Não foi possível carregar os dados.", error);
            alert("Falha ao carregar os dados. Verifique a configuração e o console.");
        } finally {
            renderInsumosList();
            showLoader(false);
            // Simula um clique na primeira aba para garantir que o conteúdo seja exibido
            document.querySelector('.tab-link.active').click();
        }
    }
    
    init();
});
