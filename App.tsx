import React, { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { 
  FileUp, LayoutGrid, FileText, Download, Search, Trash2, 
  ChevronRight, Truck, X, Loader2, Zap, ArrowRight, 
  Scale, Globe, Menu, ExternalLink, 
  Link as LinkIcon, AlertCircle, Box, Info, Code,
  CreditCard, MapPin, Weight, DollarSign, Hash,
  Tag, ClipboardList, Building2, CloudDownload, UserCheck, MessageSquare, Map, Percent,
  CheckCircle2, AlertTriangle, Calculator, Users, Layers
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { CTeData, AppTab } from './types';
import { parseCTeXML } from './services/xmlParser';

const LogoIsas: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <div className="relative w-12 h-10 flex">
      <svg viewBox="0 0 100 100" className="w-1/2 h-full fill-red-900 -mr-2">
        <path d="M70 10 L20 50 L70 90 L85 75 L50 50 L85 25 Z" />
      </svg>
      <svg viewBox="0 0 100 100" className="w-1/2 h-full fill-red-600">
        <path d="M50 10 L0 50 L50 90 L65 75 L30 50 L65 25 Z" transform="translate(40, 0)" />
      </svg>
    </div>
  </div>
);

const SidebarItem: React.FC<{ id: AppTab; active: boolean; icon: React.ReactNode; label: string; onClick: (id: AppTab) => void }> = ({ id, active, icon, label, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-4 px-5 py-4 mb-2 transition-all rounded-2xl text-base font-bold ${active ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
  >
    {icon} <span>{label}</span>
  </button>
);

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('upload');
  const [data, setData] = useState<CTeData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    const results: CTeData[] = [];
    const fileList = Array.from(files);

    for (const f of fileList) {
      try {
        const ext = f.name.toLowerCase().split('.').pop();
        if (ext === 'xml') {
          const content = await f.text();
          const p = await parseCTeXML(f.name, content);
          if (p) results.push(p);
        } else if (ext === 'zip') {
          const zip = await JSZip.loadAsync(f);
          const xmlFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.xml'));
          for (const name of xmlFiles) {
            const content = await zip.files[name].async("text");
            const p = await parseCTeXML(name, content);
            if (p) results.push(p);
          }
        }
      } catch (err) {
        console.error(`Falha ao ler arquivo ${f.name}:`, err);
      }
    }
    
    if (results.length > 0) {
      setData(prev => [...prev, ...results]);
      setActiveTab('tags');
    } else {
      alert("Nenhum CT-e válido encontrado.");
    }
    setIsLoading(false);
  };

  const filteredData = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return data;
    return data.filter(d => 
      d.nCT.includes(s) || 
      d.origem.toLowerCase().includes(s) || 
      d.destino.toLowerCase().includes(s) ||
      d.chave.includes(s) ||
      d.emitente.toLowerCase().includes(s) ||
      d.destinatario.toLowerCase().includes(s)
    );
  }, [data, search]);

  const selectedData = useMemo(() => {
    return data.find(d => d.id === selectedId) || null;
  }, [data, selectedId]);

  if (!hasStarted) return <LandingPage onStart={() => setHasStarted(true)} />;

  return (
    <div className="flex h-screen w-full bg-slate-50 flex-col overflow-hidden text-slate-900">
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
          <Truck className="animate-truck-jump text-red-500 mb-6" size={64} />
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Processando ISA'S Cloud</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sincronizando Atributos...</p>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-950 z-50 transform transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-white/5 flex flex-col items-start text-white">
          <div className="flex items-center gap-3 mb-4">
            <LogoIsas className="w-8 h-6" />
            <h1 className="font-black italic text-xs uppercase tracking-tighter">ISA'S <span className="text-red-600">TRANSPORTES</span></h1>
          </div>
          <div className="flex justify-between w-full items-center">
             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Atributo Cloud</span>
             <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={18} /></button>
          </div>
        </div>
        <nav className="p-6 space-y-2">
          <SidebarItem id="upload" label="Importar Local" active={activeTab === 'upload'} icon={<FileUp size={18}/>} onClick={t => {setActiveTab(t); setIsSidebarOpen(false);}} />
          <SidebarItem id="tags" label="Lote XML" active={activeTab === 'tags'} icon={<LayoutGrid size={18}/>} onClick={t => {setActiveTab(t); setIsSidebarOpen(false);}} />
          <SidebarItem id="info" label="Detalhes" active={activeTab === 'info'} icon={<FileText size={18}/>} onClick={t => {setActiveTab(t); setIsSidebarOpen(false);}} />
          <SidebarItem id="export" label="Relatório" active={activeTab === 'export'} icon={<Download size={18}/>} onClick={t => {setActiveTab(t); setIsSidebarOpen(false);}} />
        </nav>
      </aside>

      <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform hover:bg-black"><Menu size={22}/></button>
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em] mb-0.5">Mapeador ISA'S</span>
            <h2 className="text-xs font-bold text-slate-800 uppercase leading-none">{activeTab}</h2>
          </div>
        </div>
        <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tight">{data.length} ITENS NO LOTE</div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        {activeTab === 'upload' && (
          <div className="h-full flex flex-col items-center justify-center gap-8">
            <label className="w-full max-w-lg bg-white border-2 border-dashed border-slate-200 p-16 rounded-[2.5rem] text-center cursor-pointer hover:border-red-600 hover:shadow-xl transition-all group shadow-sm">
              <input type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} accept=".xml,.zip" />
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg"><FileUp size={40} /></div>
              <h3 className="font-black text-slate-800 uppercase text-lg mb-2">Upload de Arquivos</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Selecione XMLs ou ZIPs locais</p>
            </label>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center">
              <div className="w-12 h-12 flex items-center justify-center text-slate-300"><Search size={20} /></div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nCT, Transportadora, Destinatário..." className="flex-1 bg-transparent border-none py-4 text-sm font-semibold outline-none" />
            </div>
            
            <div className="flex flex-col gap-4">
              {filteredData.map((d) => (
                <div 
                  key={d.id} 
                  onClick={() => { setSelectedId(d.id); setActiveTab('info'); }} 
                  className="bg-white p-6 rounded-[1.5rem] border hover:shadow-xl transition-all cursor-pointer group border-slate-200 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${d.statusConciliacao === 'Conciliado' ? 'bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[2px_0_10_rgba(239,68,68,0.3)]'}`}></div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-red-600 uppercase tracking-tighter">nCT {d.nCT}</span>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${d.statusConciliacao === 'Conciliado' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className={`text-[9px] font-black uppercase ${d.statusConciliacao === 'Conciliado' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {d.statusConciliacao}
                        </span>
                      </div>
                    </div>
                    <div className="font-black text-slate-900 text-xl">R$ {d.valor}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-md">{d.destinatario}</div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                      <span className="bg-slate-50 px-2 py-0.5 rounded uppercase">{d.origem}</span> 
                      <ArrowRight size={12} className="text-red-300 shrink-0"/> 
                      <span className="bg-slate-50 px-2 py-0.5 rounded uppercase">{d.destino}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase text-slate-400">
                      <div className="flex items-center gap-1.5"><Truck size={12} className="text-red-500"/> {d.tipoVeiculo}</div>
                      <div className="text-red-600 italic font-bold">{d.tipoOperacao}</div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center text-slate-200 group-hover:text-red-600 transition-colors pl-4">
                    <ChevronRight size={24} />
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Box className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum CT-e encontrado no lote</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedData ? (
              <>
                <div className={`p-8 rounded-[2.5rem] border shadow-lg ${selectedData.statusConciliacao === 'Conciliado' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl ${selectedData.statusConciliacao === 'Conciliado' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {selectedData.statusConciliacao === 'Conciliado' ? <CheckCircle2 size={32}/> : <AlertTriangle size={32}/>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${selectedData.statusConciliacao === 'Conciliado' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                          <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${selectedData.statusConciliacao === 'Conciliado' ? 'text-emerald-900' : 'text-red-900'}`}>
                            {selectedData.statusConciliacao === 'Conciliado' ? 'FRETE CONCILIADO' : 'ERRO NA CONCILIAÇÃO'}
                          </h2>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Auditoria Financeira ISA'S TRANSPORTES • nCT {selectedData.nCT}</p>
                      </div>
                    </div>
                    <div className="bg-white/50 p-6 rounded-3xl border border-white flex items-center gap-8 shadow-sm">
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Soma Auditoria</span>
                        <p className="text-xl font-black text-slate-800">R$ {selectedData.valorCalculadoSoma}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200"></div>
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Total CTe</span>
                        <p className="text-xl font-black text-slate-800">R$ {selectedData.valor}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Destaque para Observação (xObs) e códigos detectados */}
                  <div className="mt-6 bg-white/40 p-6 rounded-3xl border border-white/50">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Info size={14} className="text-red-500"/> Observação do XML (xObs)
                      </div>
                      <div className="flex items-center gap-3">
                         {selectedData.numeroLT !== "N/A" && (
                           <div className="px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow-md">Cod. Cotação: {selectedData.numeroLT}</div>
                         )}
                         {selectedData.romaneio !== "N/A" && (
                           <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow-md">SOLTRANSP: {selectedData.romaneio}</div>
                         )}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                      {selectedData.observacao || "Nenhuma observação informada no XML."}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200/50">
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <Calculator size={14} className="text-slate-400"/> 
                      <div className="flex items-center gap-1.5">ICMS <span className="text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm">R$ {selectedData.valorIcmsComp}</span></div>
                      <span>+</span>
                      <div className="flex items-center gap-1.5">Pedágio <span className="text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm">R$ {selectedData.valorPedagio}</span></div>
                      <span>+</span>
                      <div className="flex items-center gap-1.5">Gris <span className="text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm">R$ {selectedData.valorGris}</span></div>
                      <span>+</span>
                      <div className="flex items-center gap-1.5">Frete (Peso) <span className="text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm">R$ {selectedData.fretePeso}</span></div>
                      <span className="text-lg">=</span>
                      <div className={`text-lg font-black italic ${selectedData.statusConciliacao === 'Conciliado' ? 'text-emerald-600' : 'text-red-600'}`}>R$ {selectedData.valorCalculadoSoma}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border shadow-sm group hover:border-red-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Users size={18}/></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Destinatário</span>
                    </div>
                    <p className="font-black text-slate-800 text-lg leading-tight uppercase">{selectedData.destinatario}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border shadow-sm group hover:border-red-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-md"><Weight size={18}/></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor Líquido</span>
                    </div>
                    <p className="font-black text-slate-800 text-xl leading-tight">R$ {selectedData.valorLiquido}</p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">(Total - ICMS)</span>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border shadow-sm group hover:border-red-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-md"><MapPin size={18}/></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trajeto Logístico</span>
                    </div>
                    <div className="flex items-center gap-2 font-black text-slate-800 text-sm leading-tight">
                      <span className="bg-slate-50 px-2 py-1 rounded uppercase tracking-tighter">{selectedData.origem}</span>
                      <ArrowRight size={14} className="text-red-400" />
                      <span className="bg-slate-50 px-2 py-1 rounded uppercase tracking-tighter">{selectedData.destino}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><Layers size={18}/></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentos Fiscais (NFe)</span>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-sm font-black text-slate-800 leading-loose break-all">
                        {selectedData.chavesNFe || "Nenhum documento identificado."}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                         <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Quantidade: {selectedData.quantidadeNFe}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">|</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">Total de Notas: {selectedData.chavesNFe ? selectedData.chavesNFe.split(' ; ').length : 0}</span>
                         </div>
                         <span className="text-[8px] font-bold text-slate-300 uppercase italic">Dados extraídos da Chave NFe</span>
                      </div>
                   </div>
                </div>
                
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><ClipboardList size={18}/></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Informações Complementares</span>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">CFOP</span>
                        <p className="text-xs font-black text-slate-700">{selectedData.cfop}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tipo Veículo</span>
                        <p className="text-xs font-black text-slate-700">{selectedData.tipoVeiculo}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Operação</span>
                        <p className="text-xs font-black text-slate-700">{selectedData.tipoOperacao}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Km Estimado</span>
                        <p className="text-xs font-black text-slate-700">{selectedData.km}</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => { setSelectedId(null); setActiveTab('tags'); }} 
                  className="w-full py-5 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm mt-4 flex items-center justify-center gap-3"
                >
                  <ArrowRight size={16} className="rotate-180" /> Voltar ao Lote de Auditoria
                </button>
              </>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center animate-bounce">
                  <FileText size={40} />
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Nenhum item selecionado</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">Selecione um CT-e na aba "Lote XML" para visualizar a auditoria completa.</p>
                <button onClick={() => setActiveTab('tags')} className="px-8 py-3 bg-red-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Ver Lote</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 gap-8">
            <div className="w-28 h-28 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl animate-pulse"><Download size={48}/></div>
            <h2 className="text-4xl font-black text-slate-950 uppercase italic tracking-tighter">Relatório Auditoria ISA'S</h2>
            <button 
              onClick={() => {
                const wsData = data.map(d => ({
                  "STATUS CONCILIACAO": d.statusConciliacao,
                  "NUMERO CTE": d.nCT,
                  "COD. COTAÇÃO": d.numeroLT,
                  "SOLTRANSP": d.romaneio,
                  "EMITENTE": d.emitente,
                  "DESTINATARIO": d.destinatario,
                  "QUANTIDADE NF-e": d.quantidadeNFe,
                  "NUMEROS NFES": d.chavesNFe,
                  "VALOR TOTAL (EMITIDO)": `R$ ${d.valor}`,
                  "VALOR AUDITADO (SOMA)": `R$ ${d.valorCalculadoSoma}`,
                  "COMPONENTE FRETE PESO": `R$ ${d.fretePeso}`,
                  "COMPONENTE ICMS": `R$ ${d.valorIcmsComp}`,
                  "COMPONENTE PEDAGIO": `R$ ${d.valorPedagio}`,
                  "COMPONENTE GRIS": `R$ ${d.valorGris}`,
                  "MUNICIPIO ORIGEM": d.origem,
                  "MUNICIPIO DESTINO": d.destino,
                  "TIPO OPERACAO": d.tipoOperacao,
                  "TIPO VEICULO": d.tipoVeiculo,
                  "OBSERVACAO (XOBS)": d.observacao,
                  "CHAVE ACESSO CTE": d.chave,
                  "ARQUIVO FONTE": d.filename
                }));

                const ws = XLSX.utils.json_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Auditoria ISA'S");
                
                const wscols = [
                  {wch: 25}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 35}, 
                  {wch: 35}, {wch: 18}, {wch: 30}, {wch: 25}, {wch: 25}, {wch: 22},
                  {wch: 22}, {wch: 22}, {wch: 22}, {wch: 25}, {wch: 25},
                  {wch: 20}, {wch: 20}, {wch: 50}, {wch: 48}, {wch: 25}
                ];
                ws['!cols'] = wscols;

                XLSX.writeFile(wb, `ISA_Relatorio_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
              }}
              disabled={data.length === 0}
              className="px-16 py-6 bg-red-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center gap-4 disabled:opacity-20 transition-all active:scale-95"
            >
              <Download size={24}/> Exportar Excel Auditado
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white text-slate-950 p-6 text-center overflow-hidden">
    <div className="absolute inset-0 bg-slate-50 opacity-50 pointer-events-none"></div>
    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-900 via-red-600 to-red-900"></div>
    <div className="relative z-10 flex flex-col items-center">
      <div className="glow-red mb-10">
        <LogoIsas className="w-32 h-24" />
      </div>
      <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-12 text-slate-950">
        ISA'S <span className="text-red-600">Transportes</span>
      </h1>
      <p className="text-slate-500 font-bold tracking-[0.3em] text-sm uppercase mb-16">Logística Sem Fronteiras</p>
      
      <button 
        onClick={onStart}
        className="px-12 py-5 bg-slate-950 text-white rounded-full font-black text-xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-red-600 transition-all active:scale-95 group"
      >
        <span>ACESSAR SISTEMA</span> 
        <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
      </button>
    </div>
  </div>
);

export default App;