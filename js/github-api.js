class GitHubAPI {
    constructor() {
        const config = JSON.parse(localStorage.getItem('github_config'));
        if (!config) {
            alert('Configuração do GitHub não encontrada. Redirecionando para a página de setup.');
            const repoName = window.location.pathname.split('/')[1] || 'despesas';
            window.location.href = `/${repoName}/setup/`;
            throw new Error("GitHub config not found.");
        }
        
        this.username = config.username;
        this.repo = config.repo;
        this.token = config.pat;
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
        };
        this.apiUrl = `https://api.github.com/repos/${this.username}/${this.repo}/contents/`;
    }

    async getFile(filePath) {
        try {
            const response = await fetch(this.apiUrl + filePath, {
                method: 'GET',
                headers: this.headers,
            });

            if (response.status === 404) {
                return { content: null, sha: null };
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                throw new Error(`Erro ao buscar o arquivo: ${response.statusText}`);
            }

            const data = await response.json();

            // --- MELHORIA DE ROBUSTEZ AQUI ---
            // Verifica se o conteúdo existe e não está vazio antes de tentar decodificar
            if (data.content && data.content.trim() !== '') {
                const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                return { content, sha: data.sha };
            } else {
                // Se o arquivo estiver vazio ou não tiver conteúdo, retorna nulo para ser tratado como um arquivo novo
                return { content: null, sha: data.sha };
            }

        } catch (error) {
            console.error("Erro em getFile:", error);
            throw error;
        }
    }

    async saveFile(filePath, content, commitMessage, sha = null) {
        try {
            const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
            const body = {
                message: commitMessage,
                content: contentBase64,
                committer: { name: 'Gerenciador Web App', email: 'app@example.com' }
            };

            if (sha) {
                body.sha = sha;
            }

            const response = await fetch(this.apiUrl + filePath, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao salvar o arquivo: ${errorData.message}`);
            }

            return await response.json();

        } catch (error) {
            console.error("Erro em saveFile:", error);
            throw error;
        }
    }
}
