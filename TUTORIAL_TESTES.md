# Tutorial: Testes Automatizados - MicroPython Multi WebREPL Client

Este tutorial explica como rodar e desenvolver testes automatizados para o projeto MicroPython Multi WebREPL Client.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração dos Testes](#configuração-dos-testes)
3. [Comandos Disponíveis](#comandos-disponíveis)
4. [Executando os Testes](#executando-os-testes)
5. [Estrutura dos Testes](#estrutura-dos-testes)
6. [Tipos de Testes](#tipos-de-testes)
7. [Escrevendo Novos Testes](#escrevendo-novos-testes)
8. [Debugging e Troubleshooting](#debugging-e-troubleshooting)

## 🎯 Visão Geral

O projeto utiliza **Vitest** como framework de testes, junto com **React Testing Library** para testes de componentes React. A configuração inclui:

- **Vitest**: Framework de testes rápido e moderno
- **React Testing Library**: Para testes de componentes React
- **@testing-library/user-event**: Para simulação de interações do usuário
- **jsdom**: Ambiente DOM simulado para testes no Node.js
- **Mocks automáticos**: Para APIs do navegador (WebSocket, Web Serial API, localStorage)

## ⚙️ Configuração dos Testes

### Arquivos de Configuração

- **`vitest.config.ts`**: Configuração principal do Vitest
- **`src/test/setup.ts`**: Setup global dos testes, incluindo mocks das APIs do navegador
- **`package.json`**: Scripts de teste configurados

### Mocks Globais

Os seguintes mocks estão configurados automaticamente:

```typescript
// Web Serial API
global.navigator.serial = {
  requestPort: vi.fn(),
  getPorts: vi.fn().mockResolvedValue([]),
  // ...
}

// WebSocket
global.WebSocket = vi.fn().mockImplementation(...)

// localStorage
Object.defineProperty(window, 'localStorage', ...)
```

## 🚀 Comandos Disponíveis

### Executar Todos os Testes
```bash
npm test
# ou
npm run test
```

### Executar Testes em Modo Watch (Desenvolvimento)
```bash
npm test
```
*O Vitest roda em modo watch por padrão*

### Executar Testes Uma Vez (CI/Produção)
```bash
npm run test:run
```

### Interface Visual dos Testes
```bash
npm run test:ui
```
*Abre uma interface web para visualizar e executar testes*

### Testes com Cobertura de Código
```bash
npm run test:coverage
```
*Gera relatório de cobertura de código*

## 🏃‍♂️ Executando os Testes

### Executar Todos os Testes
```bash
# No terminal, na raiz do projeto
npm test

# Saída esperada:
✓ src/features/connections/hooks/__tests__/useSerial.test.ts (25)
✓ src/features/connections/hooks/__tests__/useWebRepl.test.ts (22)
✓ src/components/terminal/__tests__/Terminal.test.tsx (18)
✓ src/components/forms/__tests__/AddConnectionForm.test.tsx (23)
✓ src/test/integration/connection-workflow.test.tsx (15)

Test Files  5 passed (5)
Tests  103 passed (103)
```

### Executar Testes Específicos
```bash
# Executar apenas testes de hooks
npm test hooks

# Executar apenas testes de componentes
npm test components

# Executar teste específico
npm test useSerial
```

### Executar com Interface Visual
```bash
npm run test:ui
```
1. Abre automaticamente no navegador (http://localhost:51204)
2. Interface visual para navegar pelos testes
3. Execução interativa com logs detalhados
4. Filtros por arquivo, status, etc.

## 📁 Estrutura dos Testes

```
src/
├── test/
│   ├── setup.ts                      # Setup global dos testes
│   └── integration/                  # Testes de integração
│       └── connection-workflow.test.tsx
├── features/
│   └── connections/
│       └── hooks/
│           └── __tests__/           # Testes dos hooks
│               ├── useSerial.test.ts
│               └── useWebRepl.test.ts
└── components/
    ├── terminal/
    │   └── __tests__/              # Testes do componente Terminal
    │       └── Terminal.test.tsx
    └── forms/
        └── __tests__/              # Testes do formulário
            └── AddConnectionForm.test.tsx
```

## 🧪 Tipos de Testes

### 1. Testes de Hooks (Unit Tests)

**Localização**: `src/features/connections/hooks/__tests__/`

**O que testam**:
- Lógica de conexão Serial e WebREPL
- Estados da conexão (conectado, desconectado, erro)
- Envio de comandos
- Processamento de dados recebidos
- Auto-reconexão

**Exemplo**:
```typescript
// useSerial.test.ts
it('should connect to serial port', async () => {
  const { result } = renderHook(() => useSerial(mockPort))
  
  await act(async () => {
    await result.current.connect()
  })
  
  expect(result.current.status).toBe(ReplStatus.CONNECTED)
})
```

### 2. Testes de Componentes (Component Tests)

**Localização**: `src/components/**/__tests__/`

**O que testam**:
- Renderização de componentes
- Interações do usuário (clicks, digitação)
- Props e estado do componente
- Callbacks e eventos

**Exemplo**:
```typescript
// Terminal.test.tsx
it('should handle command submission', async () => {
  const user = userEvent.setup()
  const mockOnCommand = vi.fn()
  
  render(<Terminal lines={[]} onCommand={mockOnCommand} />)
  
  const input = screen.getByRole('textbox')
  await user.type(input, 'print("hello")')
  await user.keyboard('{Enter}')
  
  expect(mockOnCommand).toHaveBeenCalledWith('print("hello")')
})
```

### 3. Testes de Integração (Integration Tests)

**Localização**: `src/test/integration/`

**O que testam**:
- Fluxos completos de usuário
- Integração entre componentes
- Persistência de dados (localStorage)
- Workflows end-to-end

**Exemplo**:
```typescript
// connection-workflow.test.tsx
it('should complete full WebREPL connection workflow', async () => {
  const user = userEvent.setup()
  render(<ReplManager />)
  
  // Adicionar conexão
  await user.click(screen.getByText('Add Connection'))
  await user.type(screen.getByLabelText('Connection Name'), 'ESP32')
  await user.click(screen.getByText('Add Connection'))
  
  // Verificar se foi criada
  expect(screen.getByText('ESP32')).toBeInTheDocument()
})
```

## ✍️ Escrevendo Novos Testes

### 1. Criar Arquivo de Teste

```typescript
// src/components/novo-componente/__tests__/NovoComponente.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NovoComponente from '../NovoComponente'

describe('NovoComponente', () => {
  const mockProps = {
    onAction: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<NovoComponente {...mockProps} />)
    
    expect(screen.getByText('Texto esperado')).toBeInTheDocument()
  })
})
```

### 2. Padrões Recomendados

#### Organizando Testes
```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {})
    it('should render with custom props', () => {})
  })
  
  describe('User Interactions', () => {
    it('should handle click events', () => {})
    it('should handle form submission', () => {})
  })
  
  describe('Error Handling', () => {
    it('should display error message', () => {})
  })
})
```

#### Setup e Cleanup
```typescript
describe('MyComponent', () => {
  let mockFn: vi.MockedFunction<any>
  
  beforeEach(() => {
    mockFn = vi.fn()
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.resetAllMocks()
  })
})
```

#### Testando Interações Assíncronas
```typescript
it('should handle async operations', async () => {
  const user = userEvent.setup()
  
  render(<AsyncComponent />)
  
  await user.click(screen.getByText('Load Data'))
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### 3. Mocking Dependencies

#### Mock de Hooks Customizados
```typescript
// Mock do hook
vi.mock('../hooks/useCustomHook', () => ({
  useCustomHook: vi.fn(() => ({
    data: 'mocked data',
    loading: false,
    error: null,
  })),
}))
```

#### Mock de APIs Externas
```typescript
beforeEach(() => {
  // Mock fetch
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ data: 'test' }),
  })
  
  // Mock console para evitar logs nos testes
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
```

## 🐛 Debugging e Troubleshooting

### Problemas Comuns

#### 1. "Cannot find module" Error
```bash
# Solução: Verificar se o path está correto no tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### 2. "WebSocket is not defined" Error
```bash
# Solução: Verificar se o mock está no setup.ts
// src/test/setup.ts
global.WebSocket = vi.fn().mockImplementation(...)
```

#### 3. Testes Lentos
```bash
# Executar apenas testes modificados
npm test --changed

# Executar com threads limitadas
npm test --max-workers=2
```

### Debug de Testes

#### 1. Usar screen.debug()
```typescript
it('should debug rendering', () => {
  render(<Component />)
  
  // Mostra o HTML renderizado
  screen.debug()
  
  // Debug apenas um elemento
  screen.debug(screen.getByRole('button'))
})
```

#### 2. Usar console.log em Testes
```typescript
it('should log values', () => {
  const result = someFunction()
  console.log('Result:', result)
  expect(result).toBe('expected')
})
```

#### 3. Breakpoints com VS Code
1. Adicione breakpoints no código do teste
2. Execute: "Debug: Start Debugging" (F5)
3. Selecione configuração "Vitest"

### Performance dos Testes

#### Otimização
```typescript
// Use renderHook para hooks em vez de componentes completos
const { result } = renderHook(() => useCustomHook())

// Mock apenas o necessário
vi.mock('./heavy-dependency', () => ({
  heavyFunction: vi.fn().mockReturnValue('mock result')
}))

// Use vi.stubGlobal para mocks globais
vi.stubGlobal('fetch', mockFetch)
```

### Executar Testes no CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

## 🎯 Métricas de Cobertura

### Visualizar Cobertura
```bash
npm run test:coverage
```

### Relatório de Cobertura
- **Statements**: Linhas de código executadas
- **Branches**: Condições testadas (if/else)
- **Functions**: Funções chamadas
- **Lines**: Linhas cobertas

### Metas de Cobertura
- **Unit Tests**: >90% cobertura
- **Integration Tests**: >80% cobertura
- **Critical Paths**: 100% cobertura (conexões, comandos)

## 📚 Recursos Adicionais

### Documentação
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)

### Exemplos de Testes
- Veja os arquivos `__tests__` existentes no projeto
- Consulte a documentação oficial para patterns avançados

### Comandos Úteis
```bash
# Executar testes específicos
npm test -- --grep "should connect"

# Executar com logs detalhados
npm test -- --reporter=verbose

# Executar apenas testes que falharam
npm test -- --retry-failed

# Executar com timeout personalizado
npm test -- --test-timeout=10000
```

---

Este tutorial fornece uma base sólida para trabalhar com testes automatizados no projeto. Para dúvidas específicas, consulte a documentação oficial ou examine os testes existentes no código.