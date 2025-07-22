/**
 * GitHub API Helper para carregar e salvar dados em um repositório.
 * Requer que as credenciais estejam salvas em localStorage sob a chave 'github_config'.
 */
class GitHubAPI {
    constructor() {
        const config = JSON.parse(localStorage.getItem('github_config'));
        if (!config) {
            alert('Configuração do GitHub não encontrada. Redirecionando para a página de setup.');
            
            // --- CORREÇÃO 1: Caminho de redirecionamento ---
            // Descobre o nome do repositório a partir da URL para criar o link correto
            const repoName = window.location.pathname.split('/')[1];
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
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            return { content, sha: data.sha };

        } catch (error) {
            console.error("Erro em getFile:", error);
            throw error;
        }
    }

    async saveFile(filePath, content, commitMessage, sha = null) {
        try {
            // --- CORREÇÃO 2: Codificação para aceitar acentos e caracteres especiais ---
            const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

            const body = {
                message: commitMessage,
                content: contentBase64,
                committer: {
                    name: 'Gerenciador Web App',
                    email: 'app@example.com'
                }
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
