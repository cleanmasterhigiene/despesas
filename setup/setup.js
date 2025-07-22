document.getElementById('github-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const config = {
        username: document.getElementById('username').value.trim(),
        repo: document.getElementById('repo').value.trim(),
        pat: document.getElementById('pat').value.trim()
    };

    if (config.username && config.repo && config.pat) {
        localStorage.setItem('github_config', JSON.stringify(config));
        alert('Configurações salvas com sucesso! Redirecionando para a página inicial.');
        window.location.href = '/';
    } else {
        alert('Por favor, preencha todos os campos.');
    }
});

// Preenche o formulário se já houver dados salvos
document.addEventListener('DOMContentLoaded', () => {
    const savedConfig = localStorage.getItem('github_config');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        document.getElementById('username').value = config.username;
        document.getElementById('repo').value = config.repo;
        // Não preenchemos o PAT por segurança
    }
});