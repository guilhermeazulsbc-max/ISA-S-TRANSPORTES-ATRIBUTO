
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

    let vBC = "0,00", pICMS = "0,00", vICMS = "0,00";
    const icmsNodes = ["ICMS00", "ICMS20", "ICMS45", "ICMS60", "ICMS90", "ICMSOutraUF", "ICMSSN"];
    for (const tag of icmsNodes) {
      const node = findElementResilient(infCte, tag);
      if (node) {
        vBC = getElementValueResilient(node, "vBC") || vBC;
        pICMS = getElementValueResilient(node, "pICMS") || pICMS;
        vICMS = getElementValueResilient(node, "vICMS") || vICMS;
        break;
      }
    }

    const camposDinamicos: Record<string, string> = {};
    const obsConts = infCte.getElementsByTagNameNS("*", "ObsCont");
    for (let i = 0; i < obsConts.length; i++) {
      const xCampo = obsConts[i].getAttribute("xCampo") || "";
      const xTexto = getElementValueResilient(obsConts[i], "xTexto");
      if (xCampo) camposDinamicos[xCampo] = xTexto;
    }

    // ID gerado a partir do nCT + Destinatário + Sufixo Aleatório para evitar duplicatas reais
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
      categoriaCarga: getElementValueResilient(infCte, "xOutCat") || "Não Identificada",
      pathCategoriaCarga: "infCte/infCTeNorm/infCarga/xOutCat",
      destinatario,
      pathDestinatario: "infCte/dest/xNome",
      observacao: getElementValueResilient(infCte, "xObs") || "N/A",
      pathObservacao: "infCte/compl/xObs",
      municipioInicio: xMunIni,
      pathMunicipioInicio: "infCte/ide/xMunIni",
      municipioFim: xMunFim,
      pathMunicipioFim: "infCte/ide/xMunFim",
      valorPedagio: pedagioVal.toFixed(2).replace('.', ','),
      pathValorPedagio: "infCte/vPrest/Comp[xNome='Pedágio']/vComp",
      valorFrete: freteGeralVal.toFixed(2).replace('.', ','),
      pathValorFrete: "infCte/vPrest/Comp[xNome='Frete']/vComp",
      valorGris: grisVal.toFixed(2).replace('.', ','),
      pathValorGris: "infCte/vPrest/Comp[xNome='Gris']/vComp",
      valorIcmsComp: icmsCompVal.toFixed(2).replace('.', ','),
      pathValorIcmsComp: "infCte/vPrest/Comp[xNome='ICMS']/vComp",
      valorCalculadoSoma: somaCalculada.toFixed(2).replace('.', ','),
      statusConciliacao: isConciliado ? 'Conciliado' : 'Erro na Conciliação',
      tipoOperacao: camposDinamicos["TipoOperacao"] || "N/A",
      tipoVeiculo: camposDinamicos["TipoVeiculo"] || "N/A",
      tipoCobranca: camposDinamicos["TipoCobranca"] || "N/A",
      rota: camposDinamicos["Rota"] || "N/A",
      fretePeso: freteFinal.toFixed(2).replace('.', ','),
      cfop,
      numeroLT: camposDinamicos["NumeroLT"] || "N/A",
      romaneio: camposDinamicos["Romaneio"] || "N/A",
      emitente,
      camposDinamicos,
      pathOperacao: "infCte/compl/ObsCont[@xCampo='TipoOperacao']",
      pathVeiculo: "infCte/compl/ObsCont[@xCampo='TipoVeiculo']",
      pathCobranca: "infCte/compl/ObsCont[@xCampo='TipoCobranca']",
      pathRota: "infCte/compl/ObsCont[@xCampo='Rota']",
      pathFretePeso: "infCte/vPrest/Comp[xNome='Frete peso']/vComp",
      pathCfop: "infCte/ide/CFOP",
      pathNumeroLT: "infCte/compl/ObsCont[@xCampo='NumeroLT']",
      pathRomaneio: "infCte/compl/ObsCont[@xCampo='Romaneio']",
      pathEmitente: "infCte/emit/xNome",
      vBC: vBC.replace('.', ','), 
      pICMS: pICMS.replace('.', ','), 
      vICMS: vICMS.replace('.', ','),
      km: "Pendente",
      caracteristicasAdicionais: getElementValueResilient(infCte, "xCaracAd") || null,
      rawXml: cleanText
    };
  } catch (error) {
    console.error(`Falha no processamento do XML ${filename}:`, error);
    return null;
  }
};
