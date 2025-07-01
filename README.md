# 🔌 MicroPython Multi-WebREPL Client

<div align="center">
  <img src="https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.7.2-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.2.0-646CFF?style=for-the-badge&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/MicroPython-Compatible-green?style=for-the-badge" alt="MicroPython">
</div>

## 📝 Descrição

Cliente web moderno para gerenciar múltiplas conexões simultâneas com dispositivos MicroPython. Suporta tanto **WebREPL** (WebSocket) quanto **Serial** (Web Serial API) com interface intuitiva e funcionalidades avançadas.

### ✨ Funcionalidades Principais

- 🔄 **Múltiplas Conexões**: Gerencie vários dispositivos MicroPython simultaneamente
- 🌐 **WebREPL + Serial**: Suporte completo para ambos os protocolos
- 💻 **Terminal Interativo**: REPL completo com histórico de comandos
- ⚙️ **Configurações Avançadas**: Baud rate, terminadores de linha, timestamps
- 💾 **Persistência Local**: Configurações salvas automaticamente
- 🎨 **Interface Moderna**: UI responsiva e intuitiva

## 🚀 Instalação e Execução

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ 
- Navegador moderno com suporte a:
  - Web Serial API (Chrome/Edge 89+)
  - WebSocket
  - ES2020+

### Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd micropython-multi-webrepl-client

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

**🌐 Acesse:** `http://localhost:5173`

### Build de Produção

```bash
# Gera build otimizado
npm run build

# Preview do build
npm run preview
```

## 📖 Como Usar

### Conexão WebREPL

1. **Clique em "Add New Connection"**
2. **Configure a conexão:**
   - 📝 Nome: "ESP32 da Sala"
   - 🌐 IP: `192.168.4.1` (IP padrão do MicroPython)
   - 🔒 Senha: (opcional, para auto-login)
3. **Clique em "Add Connection"**
4. **Conexão automática!** ✅

### Conexão Serial

1. **Selecione "Serial" no tipo de conexão**
2. **Configure:**
   - 📝 Nome: "Arduino Nano ESP32"
   - ⚡ Baud Rate: `115200` (padrão)
   - 📡 Porta: Clique em "Select Serial Port"
   - ⌨️ Terminador: `\r` (padrão MicroPython)
3. **Opções avançadas:**
   - ✅ Autoscroll
   - 🕐 Mostrar timestamps
4. **Conexão automática!** ✅

### Usando o Terminal

- **Digite comandos** Python normalmente
- **Histórico:** Use ↑/↓ para navegar
- **Limpar:** Botão "Limpar saída"
- **Enter único:** Comandos funcionam com um Enter


## 🛠️ Stack Tecnológico

| Componente | Tecnologia | Versão |
|------------|------------|---------|
| **Frontend** | React | 19.1.0 |
| **Linguagem** | TypeScript | 5.7.2 |
| **Build Tool** | Vite | 6.2.0 |
| **Styling** | TailwindCSS | Latest |
| **APIs** | WebSocket, Web Serial API | Native |

## 🌟 Funcionalidades Detalhadas

### WebREPL (WebSocket)
- 🔐 **Auto-autenticação** com senhas salvas
- 🔄 **Reconexão manual** via botão
- 🧹 **Sanitização** de caracteres de controle
- ⚡ **Baixa latência** para comandos

### Serial (Web Serial API) 
- 🔌 **Auto-conexão** ao criar nova conexão
- ⚙️ **Configuração completa** (baud, terminadores, etc.)
- 📊 **Monitoramento estilo Arduino IDE**
- 🔄 **Reconexão automática** por vendorId/productId

### Terminal Interativo
- 📚 **Histórico de comandos** (↑/↓)
- 🎨 **Syntax highlighting** (sistema/erro)
- 📜 **Autoscroll** configurável
- 🕐 **Timestamps** opcionais
- 🧹 **Limpeza de output**

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── AddConnectionForm.tsx
│   ├── ReplConnectionCard.tsx  
│   ├── ReplManager.tsx
│   ├── Terminal.tsx
│   └── icons/          # Ícones SVG
├── hooks/              # Custom Hooks
│   ├── useSerial.ts    # Conexões seriais
│   └── useWebRepl.ts   # Conexões WebREPL
├── types.ts            # Tipos TypeScript
└── App.tsx             # Componente raiz
```

## 🔧 Configurações Suportadas

### Serial
- **Baud Rates:** 300 - 2.000.000 bps
- **Terminadores:** None, `\n`, `\r`, `\r\n`
- **Auto-scroll:** Sim/Não
- **Timestamps:** Sim/Não

### WebREPL
- **Protocolos:** `ws://` e `wss://`
- **Portas:** Padrão 8266
- **Autenticação:** Senha opcional

## 🐛 Solução de Problemas

### ❌ "Port access denied"
**Solução:** Autorize o acesso à porta serial no navegador

### ❌ "Connection refused"
**Solução:** Verifique IP/porta do dispositivo MicroPython

### ❌ "Port already in use"
**Solução:** Feche outras aplicações usando a mesma porta

### ❌ Duplo Enter necessário
**Solução:** ✅ **Já corrigido!** Use terminador `\r` (padrão)

## 📚 Documentação

- 📖 **[Documentação Técnica Completa](./DOCUMENTACAO_TECNICA.md)**
- 🔧 **[Guia do Claude Code](./CLAUDE.md)**

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 TODO/Roadmap

### ✅ Concluído
- [x] Suporte completo a WebREPL e Serial
- [x] Interface estilo Arduino Serial Monitor
- [x] Auto-conexão para novas conexões
- [x] Configurações avançadas (baud, terminadores)
- [x] Timestamps e autoscroll
- [x] Documentação técnica

### 🔄 Em Desenvolvimento
- [ ] Temas claro/escuro
- [ ] Export/import de configurações
- [ ] Upload de arquivos via WebREPL

### 🔮 Futuro
- [ ] Editor de código integrado
- [ ] Plugin system
- [ ] Sincronização na nuvem
- [ ] Suporte a SSH/Telnet

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

<div align="center">
  <p><strong>🚀 Desenvolvido com ❤️ para a comunidade MicroPython</strong></p>
</div>