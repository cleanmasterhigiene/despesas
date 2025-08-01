document.addEventListener('DOMContentLoaded', async () => {
    // ===================================================================
    // --- 1. STATE & API ---
    // ===================================================================
    const api = new GitHubAPI();
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    let appData = { insumos: [], servicosPadrao: [], clientes: [], servicosPrestados: [] };
    let fileSHA = null;
    let orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] };
    let insumosVinculadosCache = [];
    const loader = document.getElementById('loader');

    // ===================================================================
    // --- 2. HELPERS (Notificações, UI, Cálculos) ---
    // ===================================================================
    const showLoader = (show) => { if (loader) loader.style.display = show ? 'flex' : 'none'; };

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
        (servicoPadrao.insumosVinculados || []).forEach(itemVinculado => {
            const insumo = (appData.insumos || []).find(i => i.id == itemVinculado.insumoId);
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
        if (!appData.insumos || appData.insumos.length === 0) {
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
                    <span>R$</span><input type="number" class="insumo-preco-edit" value="${(insumo.precoTotal || 0).toFixed(2)}" step="0.01">
                    <span>/</span><input type="number" class="insumo-qtd-edit" value="${insumo.quantidadeTotal || 0}" step="0.01">
                    <span>${insumo.unidadeMedida}</span>
                </div>
                <div class="insumo-custo-calculado">Custo: R$ ${(insumo.custoPorUnidade || 0).toFixed(2)}/${insumo.unidadeMedida}</div>
                <button type="button" class="delete-btn" data-id="${insumo.id}">&times;</button>
            `;
            lista.appendChild(item);
        });
    }

    function renderServicosPadraoList() {
        const lista = document.getElementById('servicos-padrao-lista');
        if(!lista) return;
        lista.innerHTML = '';
        if (!appData.servicosPadrao || appData.servicosPadrao.length === 0) {
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
        (appData.insumos || []).forEach(insumo => select.add(new Option(insumo.nome, insumo.id)));
    }
    
    function populateServicoPadraoSelect() {
        const select = document.getElementById('servico-select-orcamento');
        if(!select) return;
        select.innerHTML = '<option value="">Selecione um serviço...</option>';
        (appData.servicosPadrao || []).forEach(sp => select.add(new Option(sp.nome, sp.id)));
    }

    function renderInsumosVinculados() {
        const container = document.getElementById('sp-insumos-container');
        if(!container) return;
        container.innerHTML = '';
        insumosVinculadosCache.forEach(item => {
            const insumoData = (appData.insumos || []).find(i => i.id == item.insumoId);
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
        const filtered = (appData.clientes || []).filter(c => c.nome.toLowerCase().includes(filter.toLowerCase()));
        if (filtered.length === 0) {
            lista.innerHTML = '<p class="empty-state">Nenhum cliente encontrado.</p>';
            return;
        }
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
        const template = document.getElementById('orcamento-item-template');
        if(!lista || !template) return;
        lista.innerHTML = '';

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
        const custoEl = document.getElementById('orcamento-custo-total');
        const precoEl = document.getElementById('orcamento-preco-total');
        const lucroEl = document.getElementById('orcamento-lucro-total');
        if (custoEl) custoEl.textContent = `R$ ${custoTotal.toFixed(2)}`;
        if (precoEl) precoEl.textContent = `R$ ${precoTotal.toFixed(2)}`;
        if (lucroEl) lucroEl.textContent = `R$ ${lucroTotal.toFixed(2)}`;
    }
    
    // ===================================================================
    // --- 4. SETUP EVENT LISTENERS (Conecta os botões às funções) ---
    // ===================================================================
    function setupEventListeners() {
        document.querySelector('.tabs')?.addEventListener('click', (e) => {
            if (e.target.matches('.tab-link')) {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
                document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove("active"));
                const tabContent = document.getElementById(tabName);
                if (tabContent) tabContent.style.display = "block";
                e.target.classList.add("active");
            }
        });

        document.getElementById('insumo-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const form = e.target;
            const novoInsumo = { id: Date.now(), nome: form.elements['insumo-nome'].value, precoTotal: parseFloat(form.elements['insumo-preco-total'].value), quantidadeTotal: parseFloat(form.elements['insumo-qtd-total'].value), unidadeMedida: form.elements['insumo-unidade'].value };
            if (!novoInsumo.nome || !novoInsumo.precoTotal || !novoInsumo.quantidadeTotal) { showToast('Preencha todos os campos do insumo.', 'error'); return; }
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
                    if (insumo.quantidadeTotal > 0) insumo.custoPorUnidade = insumo.precoTotal / insumo.quantidadeTotal; else insumo.custoPorUnidade = 0;
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

        document.getElementById('sp-add-insumo-btn')?.addEventListener('click', () => {
            const insumoId = document.getElementById('sp-insumo-select').value; const quantidade = parseFloat(document.getElementById('sp-insumo-quantidade').value);
            if (!insumoId || !quantidade) { showToast('Selecione um insumo e a quantidade.', 'error'); return; }
            if (!insumosVinculadosCache.some(i => i.insumoId == insumoId)) { insumosVinculadosCache.push({ insumoId: parseInt(insumoId), quantidade }); renderInsumosVinculados(); }
        });
        
        document.getElementById('sp-insumos-container')?.addEventListener('click', (e) => {
            if (e.target.matches('.delete-btn')) { const insumoIdToRemove = parseInt(e.target.dataset.insumoId); insumosVinculadosCache = insumosVinculadosCache.filter(i => i.insumoId !== insumoIdToRemove); renderInsumosVinculados(); }
        });
        
        document.getElementById('servico-padrao-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const form = e.target; const nome = form.elements['sp-nome'].value;
            if (!nome) { showToast('O nome do serviço é obrigatório.', 'error'); return; }
            const novoServico = { id: Date.now(), nome, custoMaoDeObra: parseFloat(form.elements['sp-mao-de-obra'].value) || 0, custoImposto: parseFloat(form.elements['sp-imposto'].value) || 0, tempoEstimado: parseInt(form.elements['sp-tempo'].value) || 0, insumosVinculados: insumosVinculadosCache };
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
        
        document.getElementById('clientes-filter-input')?.addEventListener('input', (e) => renderClientesList(e.target.value));
        
        document.getElementById('clientes-lista')?.addEventListener('click', (e) => {
            if (e.target.matches('.cliente-list-item')) {
                const clienteId = parseInt(e.target.dataset.id);
                const historico = (appData.servicosPrestados || []).filter(sp => sp.clienteId === clienteId).sort((a,b) => new Date(b.data) - new Date(a.data));
                const nomeEl = document.getElementById('cliente-detalhes-nome'); if (nomeEl) nomeEl.textContent = `Histórico de: ${e.target.textContent}`;
                const container = document.getElementById('cliente-detalhes-historico'); if (!container) return; container.innerHTML = '';
                if (historico.length > 0) {
                    historico.forEach(h => {
                        const item = document.createElement('div'); item.className = 'historico-servico-item';
                        const dataFormatada = h.data ? new Date(h.data+'T00:00:00').toLocaleDateString('pt-BR') : 'Data não informada';
                        item.innerHTML = `<span class="data">${dataFormatada}:</span> ${(h.servicos || []).map(s=>s.nome).join(', ')} - <strong>Total: R$${h.precoTotal.toFixed(2)}</strong>`;
                        container.appendChild(item);
                    });
                } else { container.innerHTML = '<p class="empty-state">Nenhum serviço registrado.</p>'; }
                document.getElementById('cliente-detalhes-container')?.classList.remove('hidden');
            }
        });

        document.getElementById('cliente-search')?.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const select = document.getElementById('cliente-select');
            if(!select) return; select.innerHTML = '';
            if (searchTerm.length > 0) {
                const filtered = (appData.clientes || []).filter(c => c.nome.toLowerCase().includes(searchTerm));
                if (filtered.length > 0) { filtered.forEach(c => select.add(new Option(c.nome, c.id))); select.classList.remove('hidden'); } else { select.classList.add('hidden'); }
            } else { select.classList.add('hidden'); }
        });
        
        document.getElementById('cliente-select')?.addEventListener('change', (e) => {
            const clienteId = e.target.value; const cliente = appData.clientes.find(c => c.id == clienteId);
            if (cliente) { orcamentoAtual.cliente = { id: cliente.id, nome: cliente.nome }; document.getElementById('cliente-search').value = cliente.nome; e.target.classList.add('hidden'); }
        });
        
        document.getElementById('show-new-client-btn')?.addEventListener('click', () => { document.getElementById('cliente-new-name')?.classList.toggle('hidden'); });
        
        document.getElementById('add-servico-orcamento-btn')?.addEventListener('click', () => {
            const servicoId = document.getElementById('servico-select-orcamento').value; if (!servicoId) return;
            const servico = appData.servicosPadrao.find(sp => sp.id == servicoId); if(!servico) return;
            const custo = calcularCustoTotalServicoPadrao(servico);
            orcamentoAtual.servicos.push({ tempId: Date.now(), servicoPadraoId: servico.id, nome: servico.nome, custo, preco: custo });
            renderOrcamentoAtual();
        });
        
        document.getElementById('orcamento-itens-lista')?.addEventListener('click', (e) => {
            if(e.target.matches('.delete-btn')) { const tempId = parseInt(e.target.dataset.tempId); orcamentoAtual.servicos = orcamentoAtual.servicos.filter(s => s.tempId !== tempId); renderOrcamentoAtual(); }
        });
        
        document.getElementById('orcamento-itens-lista')?.addEventListener('input', (e) => {
            if(e.target.matches('.item-preco-input')) {
                const tempId = parseInt(e.target.dataset.tempId); const novoPreco = parseFloat(e.target.value) || 0;
                const servico = orcamentoAtual.servicos.find(s => s.tempId === tempId);
                if(servico) servico.preco = novoPreco; updateOrcamentoTotal();
            }
        });
        
        document.getElementById('orcamento-form')?.addEventListener('submit', async (e) => { e.preventDefault();
            const nomeNovoCliente = document.getElementById('cliente-new-name').value;
            if (nomeNovoCliente && (!orcamentoAtual.cliente || !orcamentoAtual.cliente.id)) {
                const novoCliente = { id: Date.now(), nome: nomeNovoCliente }; (appData.clientes = appData.clientes || []).push(novoCliente);
                orcamentoAtual.cliente = { id: novoCliente.id, nome: novoCliente.nome };
            }
            if (!orcamentoAtual.cliente || !orcamentoAtual.cliente.id) { showToast('Selecione ou cadastre um cliente.', 'error'); return; }
            if (orcamentoAtual.servicos.length === 0) { showToast('Adicione pelo menos um serviço.', 'error'); return; }
            
            const totais = orcamentoAtual.servicos.reduce((acc, s) => { acc.custo += s.custo; acc.preco += s.preco; return acc; }, { custo: 0, preco: 0 });
            const servicoPrestado = { id: Date.now(), data: document.getElementById('orcamento-data').value, clienteId: orcamentoAtual.cliente.id, clienteNome: orcamentoAtual.cliente.nome, servicos: orcamentoAtual.servicos.map(({tempId, ...rest}) => rest), custoTotal: totais.custo, precoTotal: totais.preco, lucroTotal: totais.preco - totais.custo };
            (appData.servicosPrestados = appData.servicosPrestados || []).push(servicoPrestado);
            await saveData(`Serviço de R$${totais.preco.toFixed(2)} para ${orcamentoAtual.cliente.nome}`);
            
            orcamentoAtual = { cliente: { id: null, nome: null }, servicos: [] }; e.target.reset(); renderOrcamentoAtual(); renderAll();
            document.getElementById('cliente-new-name')?.classList.add('hidden'); document.getElementById('cliente-search').value = '';
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
