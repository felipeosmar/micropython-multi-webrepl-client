# 📁 Estrutura do Projeto

Documentação da arquitetura modular reorganizada seguindo as melhores práticas de engenharia de software.

## 🏗️ Arquitetura Geral

```
src/
├── app/                    # 🚀 Aplicação principal
│   ├── App.tsx            # Componente raiz da aplicação
│   └── main.tsx           # Ponto de entrada (entry point)
│
├── components/             # 🧩 Componentes reutilizáveis
│   ├── common/            # Componentes genéricos
│   │   ├── ErrorBoundary.tsx
│   │   └── index.ts
│   ├── forms/             # Componentes de formulário
│   │   ├── AddConnectionForm.tsx
│   │   └── index.ts
│   ├── icons/             # Ícones centralizados
│   │   ├── [8 ícones SVG]
│   │   └── index.ts       # Barrel export de todos os ícones
│   ├── terminal/          # Componentes do terminal
│   │   ├── Terminal.tsx
│   │   └── index.ts
│   └── index.ts           # Barrel export de todos os componentes
│
├── features/              # 🎯 Módulos organizados por domínio
│   ├── connections/       # Feature: Gerenciamento de conexões
│   │   ├── components/    # Componentes específicos de conexões
│   │   │   ├── ReplConnectionCard.tsx
│   │   │   ├── ReplManager.tsx
│   │   │   └── index.ts
│   │   ├── context/       # Context API para estado de conexões
│   │   │   ├── ConnectionContext.tsx
│   │   │   └── index.ts
│   │   ├── hooks/         # Hooks específicos de conexões
│   │   │   ├── useSerial.ts
│   │   │   ├── useWebRepl.ts
│   │   │   └── index.ts
│   │   ├── services/      # Lógica de negócio
│   │   │   ├── ConnectionService.ts
│   │   │   └── index.ts
│   │   ├── types/         # Tipos específicos de conexões
│   │   │   ├── connection.types.ts
│   │   │   └── index.ts
│   │   └── index.ts       # Barrel export da feature completa
│   │
│   └── file-manager/      # Feature: Gerenciamento de arquivos
│       ├── components/    # Componentes específicos de arquivos
│       │   ├── FileList.tsx
│       │   ├── FileManagerPanel.tsx
│       │   ├── FileUpload.tsx
│       │   └── index.ts
│       ├── hooks/         # Hooks específicos de arquivos
│       │   ├── useFileOperations.ts
│       │   ├── useSimpleFileCommands.ts
│       │   └── index.ts
│       ├── assets/        # Assets Python
│       │   ├── boot.py
│       │   ├── webrepl_cfg.py
│       │   └── index.ts
│       └── index.ts       # Barrel export da feature completa
│
├── shared/                # 🔄 Código compartilhado
│   ├── types/             # Tipos globais
│   │   ├── global.types.ts
│   │   └── index.ts       # Re-exports de features + tipos globais
│   ├── utils/             # Utilitários
│   │   ├── debounce.ts
│   │   └── index.ts
│   ├── constants/         # Constantes da aplicação
│   │   ├── app.constants.ts
│   │   └── index.ts
│   └── index.ts           # Barrel export de todo código compartilhado
│
└── index.ts               # Barrel export principal do projeto
```

## 🎯 Princípios da Arquitetura

### 1. **Feature-Based Organization**
- Cada feature é um módulo independente
- Contém tudo relacionado a uma funcionalidade específica
- Facilita manutenção e escalabilidade

### 2. **Barrel Exports**
- Cada pasta tem um `index.ts` que exporta seu conteúdo
- Imports limpos: `import { Component } from '@/features/connections'`
- Facilita refatoração e mudanças internas

### 3. **Separation of Concerns**
- **Components**: Apenas UI e apresentação
- **Hooks**: Lógica de estado e side effects
- **Services**: Lógica de negócio pura
- **Types**: Definições de tipos centralizadas

### 4. **Shared vs Feature**
- **Shared**: Código usado por múltiplas features
- **Features**: Código específico de uma funcionalidade

## 📦 Como Importar

### ✅ Imports Recomendados

```typescript
// Features completas
import { ReplManager, useConnections } from '@/features/connections';
import { FileManagerPanel } from '@/features/file-manager';

// Componentes reutilizáveis
import { Terminal } from '@/components/terminal';
import { ErrorBoundary } from '@/components/common';
import { PlusIcon, TrashIcon } from '@/components/icons';

// Tipos e utilitários
import { ReplConnection, DebouncedStorage } from '@/shared';
import { DEFAULT_BAUD_RATE } from '@/shared/constants';
```

### ❌ Evitar

```typescript
// Não fazer - imports diretos sem barrel exports
import ReplManager from '@/features/connections/components/ReplManager';
import { useConnections } from '@/features/connections/context/ConnectionContext';

// Não fazer - imports relativos profundos
import { PlusIcon } from '../../../components/icons/PlusIcon';
```

## 🔧 Configuração

### Path Aliases
- `@/` aponta para `src/`
- Configurado em `vite.config.ts` e `tsconfig.json`

### Build Configuration
- **Vite**: Configurado para suportar assets `.py`
- **TypeScript**: Strict mode habilitado
- **Assets**: Python files incluídos como raw imports

## 🚀 Benefícios da Nova Estrutura

### 1. **Escalabilidade**
- Fácil adicionar novas features
- Cada módulo é independente
- Não há conflitos entre features

### 2. **Maintainability**
- Código relacionado agrupado
- Imports claros e organizados
- Fácil encontrar e modificar código

### 3. **Testability**
- Módulos isolados facilitam testes
- Mocking simplificado
- Coverage por feature

### 4. **Developer Experience**
- Autocomplete melhorado
- Navegação intuitiva
- Refatoração mais segura

### 5. **Team Collaboration**
- Diferentes desenvolvedores podem trabalhar em features separadas
- Menos conflitos de merge
- Código autodocumentado pela estrutura

## 📋 Guidelines para Desenvolvimento

### Adicionando Nova Feature
1. Criar pasta em `src/features/nova-feature/`
2. Seguir estrutura padrão: `components/`, `hooks/`, `types/`, etc.
3. Criar `index.ts` com barrel exports
4. Adicionar export em `src/index.ts`

### Adicionando Componente Reutilizável
1. Identificar categoria: `common/`, `forms/`, etc.
2. Adicionar em `src/components/[categoria]/`
3. Exportar em `index.ts` da categoria
4. Verificar se não deveria estar em uma feature específica

### Adicionando Tipos
1. **Feature-specific**: `src/features/[feature]/types/`
2. **Global**: `src/shared/types/global.types.ts`
3. Sempre criar barrel exports

## 🎉 Resultado

A nova estrutura oferece uma base sólida para desenvolvimento contínuo, facilitando manutenção, testes e colaboração em equipe, seguindo as melhores práticas da indústria para projetos React/TypeScript.