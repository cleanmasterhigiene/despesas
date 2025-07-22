document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const loader = document.getElementById('loader');
    const modal = document.getElementById('modal');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const closeModalBtn = document.querySelector('.close-button');
    const expenseForm = document.getElementById('expense-form');
    const filterMonth = document.getElementById('filter-month');
    const categoriaSearch = document.getElementById('categoria-search');
    const categoriaSelect = document.getElementById('categoria');
    const parceladoCheckbox = document.getElementById('parcelado');
    const parcelasContainer = document.getElementById('parcelas-container');

    // --- ESTADO DA APLICAÇÃO ---
    let allExpenses = [];
    let fileSHA = null;
    const GITHUB_FILE_PATH = 'data/despesas.json';
    const api = new GitHubAPI();

    const expenseCategories = [
        'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação',
        'Lazer', 'Vestuário', 'Contas Fixas', 'Investimentos', 'Dívidas', 'Outros'
    ];
    
    // --- FUNÇÕES ---

    const showLoader = (show = true) => {
        loader.style.display = show ? 'flex' : 'none';
    };

    const toggleModal = (show = true) => {
        modal.style.display = show ? 'flex' : 'none';
        if (!show) expenseForm.reset();
        parcelasContainer.classList.add('hidden');
    };
    
    const populateCategoryOptions = (filter = '') => {
        categoriaSelect.innerHTML = '';
        const filteredCategories = expenseCategories.filter(cat => cat.toLowerCase().includes(filter.toLowerCase()));
        filteredCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoriaSelect.appendChild(option);
        });
    };

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const renderExpenses = () => {
        const expensesList = document.getElementById('expenses-list');
        const [year, month] = filterMonth.value.split('-');
        
        const filteredExpenses = allExpenses.filter(expense => {
            const expenseDate = new Date(expense.data + 'T00:00:00'); // Garante que a data seja local
            return expenseDate.getFullYear() == year && (expenseDate.getMonth() + 1) == month;
        });

        // Ordenar por data
        filteredExpenses.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        expensesList.innerHTML = '';

        if (filteredExpenses.length === 0) {
            expensesList.innerHTML = '<p class="empty-state">Nenhuma despesa encontrada para este período.</p>';
        } else {
            filteredExpenses.forEach(expense => {
                const item = document.createElement('div');
                item.className = 'expense-item';
                item.innerHTML = `
                    <div class="expense-category-icon" style="background-color: ${getCategoryColor(expense.categoria)}">${expense.categoria.charAt(0)}</div>
                    <div class="expense-details">
                        <p class="expense-desc">${expense.descricao}</p>
                        <p class="expense-cat-date">${expense.categoria} - ${formatDate(expense.data)}</p>
                    </div>
                    <div class="expense-amount">- R$ ${expense.valor.toFixed(2)}</div>
                `;
                expensesList.appendChild(item);
            });
        }
        updateSummary();
    };
    
    const updateSummary = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const futureLimitDate = new Date();
        futureLimitDate.setDate(now.getDate() + 30);

        const totalMes = allExpenses
            .filter(e => {
                const d = new Date(e.data + 'T00:00:00');
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + e.valor, 0);

        const totalFuturo = allExpenses
             .filter(e => {
                const d = new Date(e.data + 'T00:00:00');
                return d > now && d <= futureLimitDate;
            })
            .reduce((sum, e) => sum + e.valor, 0);

        document.getElementById('total-mes').textContent = `R$ ${totalMes.toFixed(2)}`;
        document.getElementById('total-futuro').textContent = `R$ ${totalFuturo.toFixed(2)}`;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        showLoader();

        const descricao = document.getElementById('descricao').value;
        const valor = parseFloat(document.getElementById('valor').value);
        const data = document.getElementById('data').value;
        const categoria = document.getElementById('categoria').value;
        const isParcelado = document.getElementById('parcelado').checked;
        const numParcelas = parseInt(document.getElementById('num-parcelas').value);

        if (isParcelado && numParcelas >= 2) {
            const valorParcela = valor / numParcelas;
            let dataParcela = new Date(data + 'T00:00:00');

            for (let i = 1; i <= numParcelas; i++) {
                allExpenses.push({
                    id: Date.now() + i,
                    descricao: `${descricao} (${i}/${numParcelas})`,
                    valor: valorParcela,
                    data: dataParcela.toISOString().split('T')[0],
                    categoria
                });
                dataParcela.setMonth(dataParcela.getMonth() + 1);
            }
        } else {
            allExpenses.push({ id: Date.now(), descricao, valor, data, categoria });
        }
        
        try {
            const commitMessage = `Adicionada despesa: ${descricao}`;
            const response = await api.saveFile(GITHUB_FILE_PATH, allExpenses, commitMessage, fileSHA);
            fileSHA = response.content.sha; // Atualiza o SHA
            renderExpenses();
            toggleModal(false);
        } catch (error) {
            alert('Falha ao salvar a despesa. Verifique o console para mais detalhes.');
            console.error(error);
        } finally {
            showLoader(false);
        }
    };
    
    const loadInitialData = async () => {
        showLoader();
        try {
            const { content, sha } = await api.getFile(GITHUB_FILE_PATH);
            if (content) {
                allExpenses = content;
                fileSHA = sha;
            } else {
                // Se o arquivo não existe, inicializa com um array vazio
                allExpenses = [];
                fileSHA = null;
            }
            renderExpenses();
        } catch (error) {
            alert('Falha ao carregar os dados do GitHub. Verifique sua configuração e conexão.');
            console.error(error);
        } finally {
            showLoader(false);
        }
    };

    const getCategoryColor = (category) => {
        // Gera uma cor consistente baseada no nome da categoria
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
            hash = category.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    
    // Configura o filtro de mês para o mês atual
    const today = new Date();
    filterMonth.value = today.toISOString().slice(0, 7);

    addExpenseBtn.addEventListener('click', () => toggleModal(true));
    closeModalBtn.addEventListener('click', () => toggleModal(false));
    expenseForm.addEventListener('submit', handleFormSubmit);
    filterMonth.addEventListener('change', renderExpenses);
    
    parceladoCheckbox.addEventListener('change', (e) => {
        parcelasContainer.classList.toggle('hidden', !e.target.checked);
    });

    categoriaSearch.addEventListener('input', (e) => {
        populateCategoryOptions(e.target.value);
    });

    populateCategoryOptions();
    loadInitialData();
});