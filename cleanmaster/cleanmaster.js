document.addEventListener('DOMContentLoaded', async () => {
    // ===================================================================
    // --- 1. STATE, API & DOM ELEMENTS ---
    // ===================================================================
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    let appData = { insumos: [], servicosPadrao: [], clientes: [], servicosPrestados: [] };
    let fileSHA = null;
    let orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] };
    let insumosVinculadosCache = [];
    const loader = document.getElementById('loader');

    // ===================================================================
    // --- 2. HELPER FUNCTIONS (Notificações, UI, Cálculos) ---
    // ===================================================================
    const showLoader = (show) => loader.style.display = show ? 'flex' : 'none';

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
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

    function calcularCustoTotalServicoPadrao(servicoPadrao) {
        let custo = (servicoPadrao.custoMaoDeObra || 0) + (servicoPadrao.custoImposto || 0);
        servicoPadrao.insumosVinculados.forEach(itemVinculado => {
            const insumo = appData.insumos.find(i => i.id == itemVinculado.insumoId);
            if (insumo) custo += insumo.custoPorUnidade * itemVinculado.quantidade;
        });
        return custo;
    }

    // ===================================================================
    // --- 3. RENDER FUNCTIONS (Atualizam a tela) ---
    // ===================================================================
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
                    <span>R$</span><input type="number" class="insumo-preco-edit" value="${insumo.precoTotal.toFixed(2)}" step="0.01">
                    <span>/</span><input type="number" class="insumo-qtd-edit" value="${insumo.quantidadeTotal}" step="0.01">
                    <span>${insumo.unidadeMedida}</span>
                </div>
                <div class="insumo-custo-calculado">Custo: R$ ${insumo.custoPorUnidade.toFixed(2)}/${insumo.unidadeMedida}</div>
                <button type="button" class="delete-btn" data-id="${insumo.id}">&times;</button>
            `;
            lista.appendChild(item);
        });
    }

    function renderServicosPadraoList() {
        const lista = document.getElementById('servicos-padrao-lista');
        if(!lista) return;
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

    function populateInsumoSelects() {
        const select = document.getElementById('sp-insumo-select');
        if(!select) return;
        select.innerHTML = '<option value="">Selecione um insumo</option>';
        appData.insumos.forEach(insumo => select.add(new Option(insumo.nome, insumo.id)));
    }
    
    function populateServicoPadraoSelect() {
        const select = document.getElementById('servico-select-orcamento');
        if(!select) return;
        select.innerHTML = '<option value="">Selecione um serviço...</option>';
        appData.servicosPadrao.forEach(sp => select.add(new Option(sp.nome, sp.id)));
    }

    function renderInsumosVinculados() {
        const container = document.getElementById('sp-insumos-container');
        if(!container) return;
        container.innerHTML = '';
        insumosVinculadosCache.forEach(item => {
            const insumoData = appData.insumos.find(i => i.id == item.insumoId);
            if(!insumoData) return;
            const div = document.createElement('div');
            div.className = 'item-vinculado';
            div.innerHTML = `<span>${item.quantidade} ${insumoData.unidadeMedida} de ${insumoData.nome}</span><button type="button" class="delete-btn" data-insumo-id="${item.insumoId}">&times;</button>`;
            container.appendChild(div);
        });
    }

    function renderClientesList(filter = '') {
        const lista = document.getElementById('clientes-lista');
        if(!lista) return;
        lista.innerHTML = '';
        if (appData.clientes.length === 0 && filter === '') {
            lista.innerHTML = '<p class="empty-state">Nenhum cliente cadastrado.</p>';
            return;
        }
        const filtered = appData.clientes.filter(c => c.nome.toLowerCase().includes(filter.toLowerCase()));
        filtered.forEach(cliente => {
            const item = document.createElement('div');
            item.className = 'cliente-list-item';
            item.textContent = cliente.nome;
            item.dataset.id = cliente.id;
            lista.appendChild(item);
        });
    }

    function renderOrcamentoAtual() {
        const lista = document.getElementById('orcamento-itens-lista');
        if(!lista) return;
        lista.innerHTML = '';
        const template = document.getElementById('orcamento-item-template');
        if(!template) return;

        orcamentoAtual.servicos.forEach(item => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.nome').textContent = item.nome;
            clone.querySelector('.custo').textContent = `Custo: R$ ${item.custo.toFixed(2)}`;
            const precoInput = clone.querySelector('.item-preco-input');
            precoInput.value = item.preco.toFixed(2);
            precoInput.dataset.tempId = item.tempId;
            clone.querySelector('.delete-btn').dataset.tempId = item.tempId;
            lista.appendChild(clone);
        });
        updateOrcamentoTotal();
    }

    function updateOrcamentoTotal() {
        const custoTotal = orcamentoAtual.servicos.reduce((acc, s) => acc + s.custo, 0);
        const precoTotal = orcamentoAtual.servicos.reduce((acc, s) => acc + s.preco, 0);
        const lucroTotal = precoTotal - custoTotal;

        document.getElementById('orcamento-custo-total').textContent = `R$ ${custoTotal.toFixed(2)}`;
        document.getElementById('orcamento-preco-total').textContent = `R$ ${precoTotal.toFixed(2)}`;
        document.getElementById('orcamento-lucro-total').textContent = `R$ ${lucroTotal.toFixed(2)}`;
    }

    // ===================================================================
    // --- 4. SETUP EVENT LISTENERS (Conecta os botões às funções) ---
    // ===================================================================
    function setupEventListeners() {
        // Lógica das Abas
        document.querySelector('.tabs')?.addEventListener('click', (e) => {
            if (e.target.matches('.tab-link')) {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
                document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove("active"));
                document.getElementById(tabName).style.display = "block";
                e.target.classList.add("active");
            }
        });

        // Aba Insumos
        document.getElementById('insumo-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const form = e.target;
            const novoInsumo = { id: Date.now(), nome: form.elements['insumo-nome'].value, precoTotal: parseFloat(form.elements['insumo-preco-total'].value), quantidadeTotal: parseFloat(form.elements['insumo-qtd-total'].value), unidadeMedida: form.elements['insumo-unidade'].value };
            novoInsumo.custoPorUnidade = novoInsumo.precoTotal / novoInsumo.quantidadeTotal;
            appData.insumos.push(novoInsumo);
            await saveData(`Cadastrado insumo: ${novoInsumo.nome}`);
            form.reset(); renderInsumosList(); populateInsumoSelects();
        });
        document.getElementById('insumos-lista')?.addEventListener('change', async (e) => {
            if (e.target.matches('.insumo-preco-edit, .insumo-qtd-edit')) {
                const itemDiv = e.target.closest('.insumo-item'); const insumoId = parseInt(itemDiv.dataset.id);
                const insumo = appData.insumos.find(i => i.id === insumoId);
                if (insumo) {
                    insumo.precoTotal = parseFloat(itemDiv.querySelector('.insumo-preco-edit').value);
                    insumo.quantidadeTotal = parseFloat(itemDiv.querySelector('.insumo-qtd-edit').value);
                    if (insumo.quantidadeTotal > 0) insumo.custoPorUnidade = insumo.precoTotal / insumo.quantidadeTotal;
                    await saveData(`Atualizado insumo: ${insumo.nome}`); renderInsumosList(); populateInsumoSelects();
                }
            }
        });
        document.getElementById('insumos-lista')?.addEventListener('click', async (e) => {
            if (e.target.matches('.delete-btn')) { if (!confirm('Excluir este insumo?')) return;
                const insumoId = parseInt(e.target.dataset.id); appData.insumos = appData.insumos.filter(i => i.id !== insumoId);
                await saveData(`Excluído insumo ID: ${insumoId}`); renderInsumosList(); populateInsumoSelects();
            }
        });

        // Aba Serviços
        document.getElementById('sp-add-insumo-btn')?.addEventListener('click', () => {
            const insumoId = document.getElementById('sp-insumo-select').value; const quantidade = parseFloat(document.getElementById('sp-insumo-quantidade').value);
            if (!insumoId || !quantidade) return;
            if (!insumosVinculadosCache.some(i => i.insumoId == insumoId)) { insumosVinculadosCache.push({ insumoId: parseInt(insumoId), quantidade }); renderInsumosVinculados(); }
        });
        document.getElementById('sp-insumos-container')?.addEventListener('click', (e) => {
            if (e.target.matches('.delete-btn')) {
                const insumoIdToRemove = parseInt(e.target.dataset.insumoId);
                insumosVinculadosCache = insumosVinculadosCache.filter(i => i.insumoId !== insumoIdToRemove); renderInsumosVinculados();
            }
        });
        document.getElementById('servico-padrao-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const form = e.target;
            const novoServico = { id: Date.now(), nome: form.elements['sp-nome'].value, custoMaoDeObra: parseFloat(form.elements['sp-mao-de-obra'].value) || 0, custoImposto: parseFloat(form.elements['sp-imposto'].value) || 0, tempoEstimado: parseInt(form.elements['sp-tempo'].value) || 0, insumosVinculados: insumosVinculadosCache };
            appData.servicosPadrao.push(novoServico);
            await saveData(`Criado modelo de serviço: ${novoServico.nome}`);
            form.reset(); insumosVinculadosCache = []; renderInsumosVinculados(); renderServicosPadraoList(); populateServicoPadraoSelect();
        });
        document.getElementById('servicos-padrao-lista')?.addEventListener('click', async (e) => {
            if (e.target.matches('.delete-btn')) { if (!confirm('Excluir este modelo?')) return;
                const servicoId = parseInt(e.target.dataset.id); appData.servicosPadrao = appData.servicosPadrao.filter(sp => sp.id !== servicoId);
                await saveData(`Excluído modelo ID: ${servicoId}`); renderServicosPadraoList(); populateServicoPadraoSelect();
            }
        });
        
        // Aba Clientes
        document.getElementById('clientes-filter-input')?.addEventListener('input', (e) => renderClientesList(e.target.value));
        document.getElementById('clientes-lista')?.addEventListener('click', (e) => {
            if (e.target.matches('.cliente-list-item')) {
                const clienteId = parseInt(e.target.dataset.id);
                const historico = appData.servicosPrestados.filter(sp => sp.clienteId === clienteId).sort((a,b) => new Date(b.data) - new Date(a.data));
                document.getElementById('cliente-detalhes-nome').textContent = `Histórico de: ${e.target.textContent}`;
                const container = document.getElementById('cliente-detalhes-historico'); container.innerHTML = '';
                if (historico.length > 0) {
                    historico.forEach(h => {
                        const item = document.createElement('div'); item.className = 'historico-servico-item';
                        item.innerHTML = `<span class="data">${new Date(h.data+'T00:00:00').toLocaleDateString('pt-BR')}:</span> ${h.servicos.map(s=>s.nome).join(', ')} - <strong>Total: R$${h.precoTotal.toFixed(2)}</strong>`;
                        container.appendChild(item);
                    });
                } else { container.innerHTML = '<p class="empty-state">Nenhum serviço registrado para este cliente.</p>'; }
                document.getElementById('cliente-detalhes-container').classList.remove('hidden');
            }
        });

        // Aba Lançamento/Orçamento
        document.getElementById('cliente-search')?.addEventListener('input', (e) => { /* ... código da resposta anterior ... */ });
        document.getElementById('cliente-select')?.addEventListener('change', (e) => { /* ... código da resposta anterior ... */ });
        document.getElementById('show-new-client-btn')?.addEventListener('click', () => { document.getElementById('cliente-new-name').classList.toggle('hidden'); });
        document.getElementById('add-servico-orcamento-btn')?.addEventListener('click', () => {
            const servicoId = document.getElementById('servico-select-orcamento').value; if (!servicoId) return;
            const servico = appData.servicosPadrao.find(sp => sp.id == servicoId);
            const custo = calcularCustoTotalServicoPadrao(servico);
            orcamentoAtual.servicos.push({ tempId: Date.now(), servicoPadraoId: servico.id, nome: servico.nome, custo: custo, preco: custo });
            renderOrcamentoAtual();
        });
        document.getElementById('orcamento-itens-lista')?.addEventListener('click', (e) => {
            if(e.target.matches('.delete-btn')) { const tempId = parseInt(e.target.dataset.tempId); orcamentoAtual.servicos = orcamentoAtual.servicos.filter(s => s.tempId !== tempId); renderOrcamentoAtual(); }
        });
        document.getElementById('orcamento-itens-lista')?.addEventListener('input', (e) => {
            if(e.target.matches('.item-preco-input')) {
                const tempId = parseInt(e.target.dataset.tempId); const novoPreco = parseFloat(e.target.value) || 0;
                const servico = orcamentoAtual.servicos.find(s => s.tempId === tempId);
                if(servico) servico.preco = novoPreco;
                updateOrcamentoTotal();
            }
        });
        document.getElementById('orcamento-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const nomeNovoCliente = document.getElementById('cliente-new-name').value;
            if (nomeNovoCliente && (!orcamentoAtual.cliente || !orcamentoAtual.cliente.id)) {
                const novoCliente = { id: Date.now(), nome: nomeNovoCliente }; appData.clientes.push(novoCliente);
                orcamentoAtual.cliente = { id: novoCliente.id, nome: novoCliente.nome };
            }
            if (!orcamentoAtual.cliente || !orcamentoAtual.cliente.id) { showToast('Selecione ou cadastre um cliente.', 'error'); return; }
            if (orcamentoAtual.servicos.length === 0) { showToast('Adicione pelo menos um serviço.', 'error'); return; }
            
            const totais = orcamentoAtual.servicos.reduce((acc, s) => { acc.custo += s.custo; acc.preco += s.preco; return acc; }, { custo: 0, preco: 0 });
            const servicoPrestado = { id: Date.now(), data: document.getElementById('orcamento-data').value, clienteId: orcamentoAtual.cliente.id, clienteNome: orcamentoAtual.cliente.nome, servicos: orcamentoAtual.servicos.map(({tempId, ...rest}) => rest), custoTotal: totais.custo, precoTotal: totais.preco, lucroTotal: totais.preco - totais.custo };
            appData.servicosPrestados.push(servicoPrestado);
            await saveData(`Serviço de R$${totais.preco.toFixed(2)} para ${orcamentoAtual.cliente.nome}`);
            
            orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] }; e.target.reset(); renderOrcamentoAtual(); renderAll();
            document.getElementById('cliente-new-name').classList.add('hidden');
        });
    }

    // ===================================================================
    // --- 5. DATA PERSISTENCE ---
    // ===================================================================
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

    // ===================================================================
    // --- 6. START THE APP ---
    // ===================================================================
    init();
});
