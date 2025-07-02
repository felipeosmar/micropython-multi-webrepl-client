// Re-export connection types from features for backward compatibility
export type { ReplConnection, ReplStatus } from '../../features/connections/types';

/**
 * Representa um item no sistema de arquivos do dispositivo MicroPython
 */
export interface FileSystemItem {
  /** Nome do arquivo ou diretório */
  name: string;
  /** Caminho completo do item */
  path: string;
  /** Tipo do item: arquivo ou diretório */
  type: 'file' | 'directory';
  /** Tamanho do arquivo em bytes (apenas para arquivos) */
  size?: number;
  /** Data de modificação (se disponível) */
  lastModified?: Date;
}

/**
 * Estado das operações do gerenciador de arquivos
 */
export interface FileManagerState {
  /** Diretório atual sendo visualizado */
  currentPath: string;
  /** Lista de itens no diretório atual */
  items: FileSystemItem[];
  /** Indica se está carregando dados */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Itens selecionados para operações em lote */
  selectedItems: string[];
}

/**
 * Resultado de uma operação de arquivo
 */
export interface FileOperationResult {
  /** Se a operação foi bem-sucedida */
  success: boolean;
  /** Mensagem de erro, se houver */
  error?: string;
  /** Dados retornados pela operação (ex: conteúdo do arquivo) */
  data?: any;
}