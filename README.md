# MicroPython Multi-WebREPL Client

Este é um cliente WebREPL baseado na web, construído com React e Vite, que permite aos usuários gerenciar e interagir com múltiplos dispositivos MicroPython a partir de um único painel.

## Funcionalidades

- **Gerenciamento de Múltiplas Conexões**: Adicione, edite e remova configurações de conexão para diferentes placas MicroPython. As conexões são salvas localmente no seu navegador.
- **Terminal REPL Interativo**: Cada conexão possui seu próprio terminal para enviar comandos e visualizar a saída em tempo real.
- **Status de Conexão**: Monitore facilmente se um dispositivo está conectado, desconectado ou em processo de conexão.
- **Login Automático**: Salve senhas para login automático em dispositivos protegidos.
- **Interface Moderna**: Uma interface de usuário limpa, responsiva e fácil de usar.

## Como Executar Localmente

**Pré-requisitos:** [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada).

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd micropython-multi-webrepl-client
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

4.  Abra seu navegador e acesse `http://localhost:5173` (ou a porta que for indicada no seu terminal).

## Como Usar

1.  Na primeira vez que usar, a tela estará vazia. Clique em "Add New Connection".
2.  Preencha o nome da conexão (ex: "ESP32 da Sala"), o endereço IP (ex: `ws://192.168.1.10`) e, opcionalmente, a senha do WebREPL.
3.  Clique em "Save".
4.  Um novo card de conexão aparecerá no painel, e o cliente tentará se conectar automaticamente.
5.  Use o terminal dentro do card para interagir com seu dispositivo MicroPython.
