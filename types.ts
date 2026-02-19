export interface CTeData {
  id: string;
  filename: string;
  nCT: string;
  chave: string;
  origem: string;
  origemUF: string;
  destino: string;
  destinoUF: string;
  valor: string; // Valor Total (vTPrest) - "Valor Transportador"
  valorLiquido: string; // Valor Total - ICMS
  caracteristicasAdicionais: string | null;
  tipoOperacao: string;
  tipoVeiculo: string;
  tipoCobranca: string;
  rota: string;
  fretePeso: string;
  cfop: string;
  numeroLT: string;
  romaneio: string;
  emitente: string;
  destinatario: string;
  categoriaCarga: string; 
  observacao: string;
  municipioInicio: string;
  municipioFim: string;
  valorPedagio: string;
  valorFrete: string;
  valorGris: string;
  valorIcmsComp: string;
  valorCalculadoSoma: string; // "Valor Conciliado"
  valorDiferenca: string; // Valor Transportador - Valor Conciliado
  statusConciliacao: 'Conciliado' | 'Erro na Conciliação';
  camposDinamicos: Record<string, string>;
  pathOperacao: string;
  pathVeiculo: string;
  pathCobranca: string;
  pathRota: string;
  pathFretePeso: string;
  pathCfop: string;
  pathNumeroLT: string;
  pathRomaneio: string;
  pathEmitente: string;
  pathDestinatario: string;
  pathCategoriaCarga: string; 
  pathObservacao: string;
  pathMunicipioInicio: string;
  pathMunicipioFim: string;
  pathValorPedagio: string;
  pathValorFrete: string;
  pathValorGris: string;
  pathValorIcmsComp: string;
  vBC: string;
  pICMS: string;
  vICMS: string;
  km: string;
  rawXml: string;
  chavesNFe: string;
  quantidadeNFe: number;
  pathChavesNFe: string;
}

export type AppTab = 'upload' | 'tags' | 'info' | 'export';