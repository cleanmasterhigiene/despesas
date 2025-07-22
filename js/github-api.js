/**
 * GitHub API Helper para carregar e salvar dados em um repositório.
 * Requer que as credenciais estejam salvas em localStorage sob a chave 'github_config'.
 */
class GitHubAPI {
    constructor() {
        const config = JSON.parse(localStorage.getItem('github_config'));
        if (!config) {
            alert('Configuração do GitHub não encontrada. Redirecionando para a página de setup.');
            window.location.href = '/setup/';
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

    /**
     * Busca o conteúdo de um arquivo no repositório.
     * @param {string} filePath - O caminho para o arquivo no repositório (ex: 'data/despesas.json').
     * @returns {Promise<object>} - Um objeto com o conteúdo decodificado e o SHA do arquivo.
     */
    async getFile(filePath) {
        try {
            const response = await fetch(this.apiUrl + filePath, {
                method: 'GET',
                headers: this.headers,
            });

            if (response.status === 404) {
                // Arquivo não existe, retorna null para que possa ser criado
                return { content: null, sha: null };
            }

            if (!response.ok) {
                throw new Error(`Erro ao buscar o arquivo: ${response.statusText}`);
            }

            const data = await response.json();
            // Conteúdo vem em base64, precisamos decodificar.
            const content = JSON.parse(atob(data.content));
            return { content, sha: data.sha };

        } catch (error) {
            console.error("Erro em getFile:", error);
            throw error;
        }
    }

    /**
     * Salva (cria ou atualiza) um arquivo no repositório.
     * @param {string} filePath - O caminho para o arquivo (ex: 'data/despesas.json').
     * @param {object} content - O objeto JavaScript para ser salvo como JSON.
     * @param {string} commitMessage - A mensagem do commit.
     * @param {string|null} sha - O SHA do arquivo, necessário para atualização. Se null, cria um novo arquivo.
     * @returns {Promise<object>} - A resposta da API do GitHub.
     */
    async saveFile(filePath, content, commitMessage, sha = null) {
        try {
            // Converte o conteúdo para uma string JSON e depois para base64.
            const contentBase64 = btoa(JSON.stringify(content, null, 2));

            const body = {
                message: commitMessage,
                content: contentBase64,
                committer: {
                    name: 'Gerenciador Web App',
                    email: 'app@example.com'
                }
            };

            // Se o SHA for fornecido, é uma atualização.
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