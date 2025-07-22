document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL ---
    let appData = { servicos: [], produtos: [], despesasFixas: [] };
    let fileSHA = null;
    const GITHUB_FILE_PATH = 'data/cleanmaster.json';
    const api = new GitHubAPI();

    // --- ELEMENTOS DO DOM ---
    const loader = document.getElementById('loader');
    const relatorioMesInput = document.getElementById('relatorio-mes');

    // --- FUNÇÕES GERAIS ---
    const showLoader = (show = true) => loader.style.display = show ? 'flex' : 'none';
    
    const saveData = async (commitMessage) => {
        showLoader();
        try {
            const response = await api.saveFile(GITHUB_FILE_PATH, appData, commitMessage, fileSHA);
            fileSHA = response.content.sha;
            alert('Dados salvos com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            alert('Falha ao salvar. Verifique o console para detalhes.');
        } finally {
            showLoader(false);
        }
    };

    // --- LÓGICA DAS ABAS ---
    window.openTab = (evt, tabName) => {
        document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = "none");
        document.querySelectorAll('.tab-link').forEach(tl => tl.className = tl.className.replace(" active", ""));
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    };

    // --- LÓGICA DE ORÇAMENTO ---
    const orcamentoForm = document.getElementById('orcamento-form');
    orcamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cliente = document.getElementById('orcamento-cliente').value;
        const itens = document.getElementById('orcamento-itens').value;
        const valor = parseFloat(document.getElementById('orcamento-valor').value);

        const texto = `Olá ${cliente}, tudo bem?\n\nSegue seu orçamento com a Clean Master Higienização:\n\nServiços:\n- ${itens.replace(/\n/g, '\n- ')}\n\nValor Total: R$ ${valor.toFixed(2)}\n\nQualquer dúvida, estou à disposição!`;

        document.getElementById('orcamento-texto').textContent = texto;
        document.getElementById('orcamento-resultado').classList.remove('hidden');
    });

    document.getElementById('copiar-orcamento').addEventListener('click', () => {
        const texto = document.getElementById('orcamento-texto').textContent;
        navigator.clipboard.writeText(texto).then(() => {
            alert('Orçamento copiado para a área de transferência!');
        });
    });

    // --- LÓGICA DE SERVIÇOS ---
    const servicoForm = document.getElementById('servico-form');
    const custosContainer = document.getElementById('servico-custos-container');
    
    document.getElementById('add-custo-btn').addEventListener('click', () => {
        const custoDiv = document.createElement('div');
        custoDiv.className = 'custo-item';
        
        const select = document.createElement('select');
        appData.produtos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.nome} (Custo: R$${p.custo.toFixed(2)})`;
            select.appendChild(option);
        });
        
        const quantidadeInput = document.createElement('input');
        quantidadeInput.type = 'number';
        quantidadeInput.placeholder = 'Qtd';
        quantidadeInput.step = '0.1';
        
        custoDiv.appendChild(select);
        custoDiv.appendChild(quantidadeInput);
        custosContainer.appendChild(custoDiv);
    });

    servicoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const custos = [];
        document.querySelectorAll('.custo-item').forEach(item => {
            const produtoId = item.querySelector('select').value;
            const quantidade = parseFloat(item.querySelector('input').value);
            if (produtoId && quantidade > 0) {
                 const produto = appData.produtos.find(p => p.id == produtoId);
                 custos.push({
                     produtoId: parseInt(produtoId),
                     nome: produto.nome,
                     quantidade: quantidade,
                     custoTotal: produto.custo * quantidade
                 });
            }
        });

        const novoServico = {
            id: Date.now(),
            data: document.getElementById('servico-data').value,
            cliente: document.getElementById('servico-cliente').value,
            descricao: document.getElementById('servico-descricao').value,
            valor: parseFloat(document.getElementById('servico-valor').value),
            custos: custos
        };
        
        appData.servicos.push(novoServico);
        await saveData(`Adicionado serviço para ${novoServico.cliente}`);
        servicoForm.reset();
        custosContainer.innerHTML = '';
        renderRelatorio();
    });

    // --- LÓGICA DE RELATÓRIO ---
    const renderRelatorio = () => {
        const [year, month] = relatorioMesInput.value.split('-');
        
        const servicosDoPeriodo = appData.servicos.filter(s => {
            const d = new Date(s.data + 'T00:00:00');
            return d.getFullYear() == year && (d.getMonth() + 1) == month;
        });

        let faturamento = 0;
        let custos = 0;
        
        servicosDoPeriodo.forEach(s => {
            faturamento += s.valor;
            s.custos.forEach(c => {
                custos += c.custoTotal;
            });
        });
        
        const lucro = faturamento - custos;
        
        document.getElementById('relatorio-faturamento').textContent = `R$ ${faturamento.toFixed(2)}`;
        document.getElementById('relatorio-custos').textContent = `R$ ${custos.toFixed(2)}`;
        document.getElementById('relatorio-lucro').textContent = `R$ ${lucro.toFixed(2)}`;
        
        const listaEl = document.getElementById('relatorio-servicos-lista');
        listaEl.innerHTML = '';
        if (servicosDoPeriodo.length > 0) {
            servicosDoPeriodo.forEach(s => {
                const custoServico = s.custos.reduce((acc, c) => acc + c.custoTotal, 0);
                const item = document.createElement('div');
                item.className = 'servico-item';
                item.innerHTML = `<strong>${s.cliente}</strong> (${s.data}): ${s.descricao} <br>
                                  Valor: R$${s.valor.toFixed(2)} | Custo: R$${custoServico.toFixed(2)}`;
                listaEl.appendChild(item);
            });
        } else {
            listaEl.innerHTML = '<p>Nenhum serviço neste período.</p>';
        }
    };

    relatorioMesInput.addEventListener('change', renderRelatorio);

    // --- INICIALIZAÇÃO ---
    const init = async () => {
        showLoader();
        // Seta data e mês padrão
        const today = new Date().toISOString();
        document.getElementById('servico-data').value = today.slice(0, 10);
        relatorioMesInput.value = today.slice(0, 7);

        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                appData = content;
                fileSHA = sha;
            }
        } catch (error) {
            console.error("Não foi possível carregar os dados. Pode ser a primeira vez.", error);
        } finally {
            renderRelatorio();
            showLoader(false);
        }
    };

    init();
});
