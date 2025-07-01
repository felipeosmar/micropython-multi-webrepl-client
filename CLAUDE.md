# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Comandos de Desenvolvimento

- `npm install` - Instala dependências do projeto
- `npm run dev` - Inicia servidor de desenvolvimento (http://localhost:5173)
- `npm run build` - Build de produção
- `npm run preview` - Preview do build de produção localmente

## Arquitetura do Projeto

Esta é uma aplicação React + TypeScript + Vite que cria um cliente web para gerenciar múltiplas conexões MicroPython WebREPL e Serial simultaneamente.

### Arquitetura Principal

**Componentes Principais:**
- `App.tsx` - Wrapper principal da aplicação com header e styling
- `ReplManager.tsx` - Componente central gerenciando todas as conexões e estado da UI
- `ReplConnectionCard.tsx` - Cards individuais de conexão com terminais
- `AddConnectionForm.tsx` - Formulário para criar novas conexões
- `Terminal.tsx` - Componente de terminal para interação REPL

**Gerenciamento de Conexões:**
- `useWebRepl.ts` - Hook para conexões WebREPL baseadas em WebSocket
- `useSerial.ts` - Hook para conexões Web Serial API
- Ambos os hooks gerenciam ciclo de vida da conexão, streaming de dados e tracking de status

**Fluxo de Dados:**
- Configurações de conexão armazenadas no localStorage do navegador
- Cada conexão mantém estado independente (status, histórico do terminal)
- Comunicação em tempo real através de WebSocket (WebREPL) ou Web Serial API
- Output do terminal sanitizado e transmitido para componentes da UI

### Funcionalidades Principais

- **Suporte multi-protocolo**: WebREPL (WebSocket) e Serial (Web Serial API)
- **Configuração persistente**: Configurações de conexão salvas localmente
- **Terminais em tempo real**: Sessões REPL interativas com histórico de comandos
- **Auto-autenticação**: Senhas armazenadas para login automático
- **UI responsiva**: Interface estilizada com TailwindCSS
- **Monitor serial estilo Arduino**: Configurações avançadas de baud rate, terminadores de linha

### Stack Técnico

- **Frontend**: React 19, TypeScript 5.7, Vite 6.2
- **Styling**: TailwindCSS (classes utilitárias em JSX)
- **APIs**: WebSocket API, Web Serial API
- **Build**: Vite com configuração TypeScript
- **Types**: Tipos customizados em `types.ts` para gerenciamento de conexão

### Configuração de Ambiente

A configuração do Vite inclui tratamento de variável de ambiente para `GEMINI_API_KEY`, sugerindo integração com a API do Google Gemini (embora não esteja sendo usada atualmente).

## Detalhes de Implementação Importantes

### Conexão Serial (useSerial.ts)

**Auto-conexão:**
- Detecta automaticamente quando uma nova porta é adicionada
- Compara `vendorId/productId` para identificar portas únicas
- Conecta automaticamente após criar nova conexão
- Timeout de 10ms para setup inicial, 50ms para mudanças de porta

**Gerenciamento de Recursos:**
- Loop de leitura assíncrono separado da função connect
- Cleanup adequado de readers/writers ao desconectar
- Verificação de disponibilidade da porta antes de tentar abrir
- Fechamento seguro apenas se porta estiver realmente aberta

**Configurações:**
- Baud rate padrão: 115200
- Terminador de linha padrão: `\r` (carriage return para MicroPython)
- Suporte a: none, `\n`, `\r`, `\r\n`
- Opções: autoscroll, timestamp

### Conexão WebREPL (useWebRepl.ts)

**Autenticação:**
- Detecção automática de prompt "Password:"
- Envio automático de senha salva
- Fallback para entrada manual se senha estiver incorreta
- Validação de "WebREPL connected"

**Comunicação:**
- Terminador fixo: `\r` (esperado pelo WebREPL)
- Sanitização de caracteres de controle
- Gerenciamento de estado com base em mensagens recebidas

### Persistência (ReplManager.tsx)

**localStorage:**
- Chave: `webrepl-connections`
- Serialização: Remove objeto `port` (não serializável)
- Reconexão: Usa `portInfo` (vendorId/productId) para reencontrar portas
- Carregamento: Tenta reestabelecer portas seriais automaticamente

### Terminal (Terminal.tsx)

**Funcionalidades:**
- Histórico de comandos com navegação ↑/↓
- Escape para limpar comando atual
- Click-to-focus automático
- Autoscroll configurável
- Syntax highlighting para mensagens de sistema/erro
- Botão de limpeza de saída

## Correções Implementadas Recentemente

### Problema do Duplo Enter (Resolvido)
- **Causa**: Terminador padrão era 'none' em vez de '\r'
- **Solução**: Alterado padrão para 'carriageReturn'
- **Arquivo**: `AddConnectionForm.tsx` e `useSerial.ts`

### Auto-conexão Serial (Resolvido)
- **Causa**: Lógica de detecção de nova porta não funcionava na criação inicial
- **Solução**: Duplo useEffect - um para mudanças, outro para setup inicial
- **Arquivo**: `useSerial.ts`

### Erro "Failed to open serial port" (Resolvido)
- **Causa**: Porta não estava sendo fechada adequadamente antes de reabrir
- **Solução**: Limpeza robusta de recursos antes de tentar conectar
- **Arquivo**: `useSerial.ts`

## Padrões de Código

### Convenções de Nomenclatura
- Componentes: PascalCase (`ReplManager.tsx`)
- Hooks: camelCase com prefixo "use" (`useSerial.ts`)
- Funções: camelCase (`sendCommand`, `appendLine`)
- Constantes: UPPER_SNAKE_CASE

### Estrutura de Hooks
- Estados no início
- Refs para referências mutáveis
- Callbacks com useCallback
- useEffects no final
- Return com interface pública

### Tratamento de Erros
- Try-catch em operações assíncronas
- Logs informativos com prefixo `[SYSTEM]`
- Logs de erro com prefixo `[SYSTEM] Error:`
- Estados de erro apropriados (`ReplStatus.ERROR`)

# important-instruction-reminders
Faça o que foi solicitado; nada mais, nada menos.
NUNCA crie arquivos a menos que sejam absolutamente necessários para atingir seu objetivo.
SEMPRE prefira editar um arquivo existente a criar um novo.
NUNCA crie proativamente arquivos de documentação (*.md) ou arquivos README. Apenas crie arquivos de documentação se explicitamente solicitado pelo Usuário.