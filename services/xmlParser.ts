import { CTeData } from '../types';

const findElementResilient = (parent: Element | Document, localName: string): Element | null => {
  if (!parent) return null;
  let el = parent.getElementsByTagNameNS("*", localName)[0];
  if (el) return el;
  
  const all = parent.getElementsByTagName("*");
  const searchName = localName.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const nodeName = (all[i].localName || all[i].nodeName.split(':').pop() || "").toLowerCase();
    if (nodeName === searchName) {
      return all[i] as Element;
    }
  }
  return null;
};

const getElementValueResilient = (parent: Element | Document, localName: string): string => {
  const el = findElementResilient(parent, localName);
  return el ? el.textContent?.trim() || "" : "";
};

const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const parseCTeXML = async (filename: string, text: string): Promise<CTeData | null> => {
  try {
    const parser = new DOMParser();
    const cleanText = text.trim().replace(/^\uFEFF/, '');
    const xml = parser.parseFromString(cleanText, "text/xml");
    
    if (xml.getElementsByTagName("parsererror").length > 0) {
      console.warn(`Erro crítico de parser no arquivo: ${filename}`);
      return null;
    }

    const infCte = findElementResilient(xml, "infCte");
    if (!infCte) return null;

    const ide = findElementResilient(infCte, "ide");
    const cfop = ide ? getElementValueResilient(ide, "CFOP") : "N/A";
    const nCT = getElementValueResilient(infCte, "nCT") || "SN";
    
    const xMunIni = ide ? getElementValueResilient(ide, "xMunIni") : "N/A";
    const xMunFim = ide ? getElementValueResilient(ide, "xMunFim") : "N/A";
    
    let chave = infCte.getAttribute("Id") || infCte.getAttribute("id") || "";
    chave = chave.replace(/[^0-9]/g, "");

    const vPrest = findElementResilient(infCte, "vPrest");
    const valorTotalStr = vPrest ? getElementValueResilient(vPrest, "vTPrest") : "0.00";
    const nValorTotal = parseFloat(valorTotalStr) || 0;

    const emit = findElementResilient(infCte, "emit");
    const emitente = emit ? getElementValueResilient(emit, "xNome") : "N/A";

    const dest = findElementResilient(infCte, "dest");
    const destinatario = dest ? getElementValueResilient(dest, "xNome") : "N/A";

    // Extração de Números de NFe (apenas o número do documento, posições 26-34 da chave)
    const nfeNumbers: string[] = [];
    const infDoc = findElementResilient(infCte, "infDoc");
    if (infDoc) {
      const infNFes = infDoc.getElementsByTagNameNS("*", "infNFe");
      for (let i = 0; i < infNFes.length; i++) {
        const fullKey = getElementValueResilient(infNFes[i], "chave");
        if (fullKey && fullKey.length === 44) {
          const nfeNum = fullKey.substring(25, 34);
          nfeNumbers.push(nfeNum);
        } else if (fullKey) {
          nfeNumbers.push(fullKey);
        }
      }
    }
    const chavesNFe = nfeNumbers.join(" ; ");

    // Extração de Componentes do Valor
    let fretePesoVal = 0;
    let pedagioVal = 0;
    let grisVal = 0;
    let icmsCompVal = 0;
    let freteGeralVal = 0;

    if (vPrest) {
      const comps = vPrest.getElementsByTagNameNS("*", "Comp");
      for (let i = 0; i < comps.length; i++) {
        const xNomeOriginal = getElementValueResilient(comps[i], "xNome");
        const xNome = normalizeText(xNomeOriginal);
        const vCompValue = parseFloat(getElementValueResilient(comps[i], "vComp")) || 0;
        
        if (xNome === "frete peso" || xNome === "frete-peso" || xNome === "fretemercadoria") {
          fretePesoVal = vCompValue;
        } else if (xNome === "frete") {
          freteGeralVal = vCompValue;
        } else if (xNome === "gris" || xNome === "seguro" || xNome === "adv") {
          grisVal = vCompValue;
        } else if (xNome === "pedagio") {
          pedagioVal = vCompValue;
        } else if (xNome === "icms") {
          icmsCompVal = vCompValue;
        }
      }
    }

    const freteFinal = fretePesoVal > 0 ? fretePesoVal : freteGeralVal;
    const somaCalculada = icmsCompVal + pedagioVal + grisVal + freteFinal;
    const isConciliado = Math.abs(somaCalculada - nValorTotal) < 0.05;

    // Extração de Impostos
    let vBC = "0,00", pICMS = "0,00", vICMS = "0,00", nVICMS = 0;
    const icmsNodes = ["ICMS00", "ICMS20", "ICMS45", "ICMS60", "ICMS90", "ICMSOutraUF", "ICMSSN"];
    for (const tag of icmsNodes) {
      const node = findElementResilient(infCte, tag);
      if (node) {
        vBC = getElementValueResilient(node, "vBC") || vBC;
        pICMS = getElementValueResilient(node, "pICMS") || pICMS;
        const vIcmsStr = getElementValueResilient(node, "vICMS") || "0";
        vICMS = vIcmsStr;
        nVICMS = parseFloat(vIcmsStr) || 0;
        break;
      }
    }

    const nValorLiquido = nValorTotal - nVICMS;

    const camposDinamicos: Record<string, string> = {};
    const compl = findElementResilient(infCte, "compl");
    const xObs = compl ? getElementValueResilient(compl, "xObs") : "";

    // EXTRAÇÃO INTELIGENTE DE CÓDIGOS DA OBSERVAÇÃO
    // Padrão 1: 10 dígitos numéricos (ex: 3157725929)
    const matchLT = xObs.match(/\b\d{10}\b/);
    const numeroLT = matchLT ? matchLT[0] : "N/A";

    // Padrão 2: Formato Ano-Sequência (ex: 2026-00231)
    const matchRomaneio = xObs.match(/\b\d{4}-\d{5}\b/);
    const romaneio = matchRomaneio ? matchRomaneio[0] : "N/A";

    const obsConts = infCte.getElementsByTagNameNS("*", "ObsCont");
    for (let i = 0; i < obsConts.length; i++) {
      const xCampo = obsConts[i].getAttribute("xCampo") || "";
      const xTexto = getElementValueResilient(obsConts[i], "xTexto");
      if (xCampo) camposDinamicos[xCampo] = xTexto;
    }

    const generatedId = `${nCT}-${destinatario.replace(/\s+/g, '')}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: generatedId,
      filename,
      nCT: nCT,
      chave,
      origem: getElementValueResilient(infCte, "xMunIni") || "N/A",
      origemUF: getElementValueResilient(infCte, "UFIni") || "??",
      destino: getElementValueResilient(infCte, "xMunFim") || "N/A",
      destinoUF: getElementValueResilient(infCte, "UFFim") || "??",
      valor: nValorTotal.toFixed(2).replace('.', ','),
      valorLiquido: nValorLiquido.toFixed(2).replace('.', ','),
      categoriaCarga: getElementValueResilient(infCte, "xOutCat") || "Não Identificada",
      destinatario,
      observacao: xObs || "N/A",
      municipioInicio: xMunIni,
      municipioFim: xMunFim,
      valorPedagio: pedagioVal.toFixed(2).replace('.', ','),
      valorFrete: freteGeralVal.toFixed(2).replace('.', ','),
      valorGris: grisVal.toFixed(2).replace('.', ','),
      valorIcmsComp: icmsCompVal.toFixed(2).replace('.', ','),
      valorCalculadoSoma: somaCalculada.toFixed(2).replace('.', ','),
      statusConciliacao: isConciliado ? 'Conciliado' : 'Erro na Conciliação',
      tipoOperacao: camposDinamicos["TipoOperacao"] || "N/A",
      tipoVeiculo: camposDinamicos["TipoVeiculo"] || "N/A",
      tipoCobranca: camposDinamicos["TipoCobranca"] || "N/A",
      rota: camposDinamicos["Rota"] || "N/A",
      fretePeso: freteFinal.toFixed(2).replace('.', ','),
      cfop,
      numeroLT: numeroLT !== "N/A" ? numeroLT : (camposDinamicos["NumeroLT"] || "N/A"),
      romaneio: romaneio !== "N/A" ? romaneio : (camposDinamicos["Romaneio"] || "N/A"),
      emitente,
      camposDinamicos,
      vBC: vBC.replace('.', ','), 
      pICMS: pICMS.replace('.', ','), 
      vICMS: vICMS.replace('.', ','),
      km: "Pendente",
      caracteristicasAdicionais: getElementValueResilient(infCte, "xCaracAd") || null,
      rawXml: cleanText,
      chavesNFe,
      pathChavesNFe: "infCte/infCTeNorm/infDoc/infNFe/chave (Reduzido)",
      pathOperacao: "", pathVeiculo: "", pathCobranca: "", pathRota: "", pathFretePeso: "", pathCfop: "", pathNumeroLT: "", pathRomaneio: "", pathEmitente: "", pathDestinatario: "", pathCategoriaCarga: "", pathObservacao: "", pathMunicipioInicio: "", pathMunicipioFim: "", pathValorPedagio: "", pathValorFrete: "", pathValorGris: "", pathValorIcmsComp: ""
    };
  } catch (error) {
    console.error(`Falha no processamento do XML ${filename}:`, error);
    return null;
  }
};