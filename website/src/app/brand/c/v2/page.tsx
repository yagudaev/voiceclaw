import React from 'react';
import { 
  Mark, 
  Wordmark, 
  IconMic, 
  IconWaveform, 
  IconBrain, 
  IconConnection, 
  IconSettings, 
  IconRouting, 
  IconMeter, 
  IconGain 
} from '@/components/brand/c/Components';

export default function BrandPageC() {
  return (
    <div className="bg-[#121214] text-[#E4E4E7] font-[family-name:var(--font-geist-sans)] selection:bg-orange-500/30">
      {/* 1. Hero Section */}
      <section className="min-h-screen flex flex-col justify-center px-8 md:px-20 border-b border-zinc-800 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] [background-size:100px_100px]"></div>
        
        {/* Real Product Metadata */}
        <div className="absolute top-0 left-0 p-8 font-[family-name:var(--font-jetbrains)] text-[10px] text-zinc-600 uppercase tracking-widest space-y-1">
            <p>PROTOCOL: VCLW/1.1-UDP</p>
            <p>ENCRYPTION: AES-256-GCM</p>
            <p>BUFFER: 12KB // 40MS</p>
            <p>PORT: 8080/WS</p>
        </div>

        <div className="absolute top-0 right-0 p-8 flex gap-4 opacity-40">
            <div className="px-3 py-4 border border-zinc-800 flex flex-col items-center justify-between gap-2 bg-zinc-900/20">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-[85%] bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px]">IN-1</span>
            </div>
            <div className="px-3 py-4 border border-zinc-800 flex flex-col items-center justify-between gap-2 bg-zinc-900/20">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-[12%] bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px]">IN-2</span>
            </div>
            <div className="px-3 py-4 border border-orange-500/30 flex flex-col items-center justify-between gap-2 bg-orange-500/5">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-[42%] bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-orange-500">BUS-A</span>
            </div>
        </div>
        
        <div className="space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-4 px-3 py-1 border border-zinc-800 bg-zinc-900/50 rounded-sm">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-widest uppercase opacity-80">VAD ACTIVE // CAPTURING SIGNAL</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl tracking-tighter leading-none">
            <Wordmark className="text-white" />
          </h1>
          
          <p className="text-2xl md:text-3xl font-[family-name:var(--font-geist-sans)] text-zinc-400 font-medium">
            Professional audio infrastructure for AI agents. 
            <span className="block text-zinc-500 font-normal">Low-latency routing, real-time telemetry, precision control.</span>
          </p>
          
          <div className="pt-12 border-t border-zinc-800 mt-12">
            <p className="text-lg leading-relaxed max-w-2xl text-zinc-300">
              VoiceClaw is a utility layer for the cognitive stack. We treat voice as a high-fidelity data stream, providing the routing, metering, and hardware-grade precision required by technical teams. The brand is the mixing desk: functional, industrial, and strictly focused on the signal path.
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 p-8">
            <Mark size={240} className="opacity-[0.03] rotate-12" />
        </div>
      </section>

      {/* 2. Mark Section */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 grid md:grid-cols-2 gap-20 bg-zinc-950/20">
        <div>
          <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">02 // The Mark</h2>
          <div className="space-y-8">
            <h3 className="text-4xl tracking-tight">The Fader Cap</h3>
            <p className="text-zinc-400 max-w-md leading-relaxed">
              Our mark is derived from the geometry of a physical control surface. It represents the point of human-to-machine contact—the fader cap. It is a symbol of intentionality, precision, and the adjustment of raw energy into governed state.
            </p>
            <div className="pt-8 grid grid-cols-3 gap-8 items-end">
                <div className="space-y-4">
                    <Mark size={120} className="text-white" />
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">120PX / MASTER</p>
                </div>
                <div className="space-y-4">
                    <Mark size={64} className="text-white" />
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">64PX / SUB</p>
                </div>
                <div className="space-y-4">
                    <Mark size={32} className="text-white" />
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">32PX / GLYPH</p>
                </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-20 border border-zinc-800 bg-zinc-900/30 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] [background-size:40px_40px]"></div>
            <div className="relative">
                <Mark size={300} className="text-orange-500 transition-transform duration-700 group-hover:scale-105" />
                {/* Visual scale around the mark */}
                <div className="absolute -inset-10 border border-zinc-800 opacity-20 pointer-events-none"></div>
                <div className="absolute top-1/2 -left-16 w-8 h-px bg-zinc-800"></div>
                <div className="absolute top-1/2 -right-16 w-8 h-px bg-zinc-800"></div>
            </div>
        </div>
      </section>

      {/* 3. Color System */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">03 // Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorSwatch name="Industrial Black" hex="#121214" oklch="oklch(22% 0.01 260)" usage="Primary Background" />
          <ColorSwatch name="Signal Orange" hex="#F97316" oklch="oklch(67% 0.22 38)" usage="Active Signal / Peak / Accent" />
          <ColorSwatch name="Ghost White" hex="#F4F4F5" oklch="oklch(96% 0.01 252)" usage="Primary Data / Text" />
          <ColorSwatch name="Zinc Secondary" hex="#71717A" oklch="oklch(53% 0.01 262)" usage="Metadata Labels" />
        </div>
      </section>

      {/* 4. Typography */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">04 // Typography</h2>
        <div className="space-y-24">
            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">UI / GEIST SANS BOLD</p>
                    <h4 className="text-8xl tracking-tighter uppercase font-bold">Signal</h4>
                </div>
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">READING / GEIST SANS REGULAR</p>
                    <p className="text-2xl leading-relaxed text-zinc-300">
                        Function over form. We prioritize legibility and strict information hierarchy. Type is used to convey state, not mood.
                    </p>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">TELEMETRY / JETBRAINS MONO</p>
                    <h4 className="text-6xl font-[family-name:var(--font-jetbrains)] uppercase">0.042s</h4>
                </div>
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">MONO / JETBRAINS MONO</p>
                    <p className="font-[family-name:var(--font-jetbrains)] text-xl text-orange-500">
                        TRANSCRIPT.PUSH(BUFFER_STREAM)
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* 5. Iconography */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">05 // Iconography</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8">
            <IconItem icon={<IconMic />} label="Capture" />
            <IconItem icon={<IconWaveform />} label="Signal" />
            <IconItem icon={<IconBrain />} label="Model" />
            <IconItem icon={<IconConnection />} label="Transport" />
            <IconItem icon={<IconSettings />} label="Config" />
            <IconItem icon={<IconRouting />} label="Route" />
            <IconItem icon={<IconMeter />} label="Telemetry" />
            <IconItem icon={<IconGain />} label="Gain" />
        </div>
      </section>

      {/* 6 & 7. App Icons */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">06-07 // Environments</h2>
        <div className="grid md:grid-cols-2 gap-20">
            {/* iOS */}
            <div className="space-y-8">
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40 uppercase tracking-widest">Mobile / iPhone Environment</p>
                <div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative p-12 flex flex-col items-center justify-center">
                    <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
                    <div className="w-32 h-32 bg-black rounded-[22%] shadow-2xl border border-zinc-700 flex items-center justify-center mb-8 relative z-10">
                        <Mark size={80} className="text-orange-500" />
                    </div>
                    <div className="text-center z-10">
                        <p className="font-bold text-lg">VoiceClaw</p>
                        <p className="text-zinc-500 text-xs font-[family-name:var(--font-jetbrains)] uppercase">v1.1.0_LATEST</p>
                    </div>
                </div>
            </div>
            
            {/* macOS */}
            <div className="space-y-8">
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40 uppercase tracking-widest">Desktop / macOS Environment</p>
                <div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative p-12 flex flex-col items-center justify-center">
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-zinc-800/50 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-4 px-8">
                        <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
                        <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl shadow-xl border border-white/10 flex items-center justify-center -translate-y-2">
                             <Mark size={32} className="text-orange-500" />
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
                        <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
                    </div>
                    <div className="text-center mb-24">
                        <p className="text-6xl font-bold opacity-10 font-[family-name:var(--font-jetbrains)] uppercase">vclw_dock_prev</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 8. iOS App Store */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">08 // iOS App Store</h2>
        <div className="max-w-4xl mx-auto bg-black border border-zinc-800 rounded-xl overflow-hidden p-8 flex flex-col md:flex-row gap-12">
            <div className="w-32 h-32 bg-zinc-900 rounded-[22%] flex-shrink-0 flex items-center justify-center border border-zinc-800">
                <Mark size={80} className="text-orange-500" />
            </div>
            <div className="flex-1 space-y-6">
                <div>
                    <h3 className="text-3xl font-bold">VoiceClaw</h3>
                    <p className="text-orange-500 font-medium font-[family-name:var(--font-jetbrains)] uppercase text-xs tracking-wider">Low-Latency Agent Gateway</p>
                </div>
                <div className="flex gap-8 border-y border-zinc-800 py-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Latency</p>
                        <p className="font-bold font-[family-name:var(--font-jetbrains)] text-white">42ms</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Protocol</p>
                        <p className="font-bold font-[family-name:var(--font-jetbrains)] text-white">VCLW</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Category</p>
                        <p className="font-bold">Utility</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {/* Mock Mobile UI */}
                    <div className="aspect-[9/19] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative flex flex-col">
                         <div className="h-1 bg-orange-500 w-full mb-4"></div>
                         <div className="space-y-2 flex-1">
                            <div className="h-4 w-1/2 bg-zinc-800 rounded-sm"></div>
                            <div className="aspect-[16/9] w-full bg-zinc-950 border border-zinc-800 rounded-sm flex items-center justify-center">
                                <IconWaveform />
                            </div>
                            <div className="grid grid-cols-4 gap-1 h-20 items-end">
                                {[30, 60, 45, 90, 75, 40, 55, 80].map((h, i) => (
                                    <div key={i} className="bg-zinc-800 w-full" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                         </div>
                    </div>
                    <div className="aspect-[9/19] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="h-4 w-full bg-zinc-800 rounded-sm"></div>
                            <div className="h-12 w-full border border-orange-500/20 rounded-sm flex items-center px-2 gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <div className="h-2 flex-1 bg-zinc-800 rounded-full"></div>
                            </div>
                        </div>
                        <div className="aspect-square w-full border border-zinc-800 rounded-full flex items-center justify-center">
                             <IconMic />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 9. Mac App Store */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">09 // Mac App Store</h2>
        <div className="max-w-5xl mx-auto bg-[#1a1a1c] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="h-10 bg-[#2a2a2c] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                <div className="flex-1 text-center font-[family-name:var(--font-jetbrains)] text-[10px] text-zinc-600">voiceclaw_console_v1.1</div>
            </div>
            <div className="p-12 flex gap-12">
                <div className="w-48 h-48 bg-black rounded-3xl flex-shrink-0 flex items-center justify-center border border-zinc-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] [background-size:20px_20px]"></div>
                    <Mark size={100} className="text-orange-500 relative z-10" />
                </div>
                <div className="flex-1 space-y-8">
                    <div>
                        <h3 className="text-5xl font-bold tracking-tight">VoiceClaw for macOS</h3>
                        <p className="text-xl text-zinc-500 font-[family-name:var(--font-jetbrains)] uppercase tracking-tight">Audio Routing & Telemetry Engine</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-2 bg-blue-600 rounded-full font-bold text-sm">GET</div>
                        <div className="px-6 py-2 border border-zinc-700 rounded-full font-bold text-sm">CLI_TOOL</div>
                    </div>
                    {/* Realistic Console UI */}
                    <div className="aspect-video w-full bg-black border border-zinc-800 rounded-lg relative overflow-hidden">
                         <div className="h-full flex">
                            {/* Channel Strips */}
                            <div className="w-48 border-r border-zinc-900 flex flex-col">
                                <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
                                    <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-zinc-500 uppercase">Input_01</span>
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                </div>
                                <div className="flex-1 p-4 flex flex-col justify-end gap-2">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className={`h-1 w-full ${i < 5 ? 'bg-orange-500/40' : i < 15 ? 'bg-zinc-800' : 'bg-zinc-900'}`}></div>
                                    ))}
                                </div>
                            </div>
                            {/* Routing Graph Mockup */}
                            <div className="flex-1 p-8 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="p-2 border border-zinc-800 bg-zinc-900/50 rounded flex items-center gap-3">
                                            <IconMic />
                                            <span className="font-[family-name:var(--font-jetbrains)] text-[10px]">CORE_CAPTURE</span>
                                        </div>
                                        <div className="w-px h-12 bg-zinc-800 ml-4"></div>
                                        <div className="p-2 border border-zinc-800 bg-zinc-900/50 rounded flex items-center gap-3">
                                            <IconRouting />
                                            <span className="font-[family-name:var(--font-jetbrains)] text-[10px]">VAD_GATE</span>
                                        </div>
                                    </div>
                                    <div className="p-2 border border-orange-500/30 bg-orange-500/5 rounded flex items-center gap-3">
                                        <IconBrain />
                                        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-orange-500 uppercase">GPT-4O_REMOTE</span>
                                    </div>
                                </div>
                                <div className="h-1/3 border-t border-zinc-900 pt-4">
                                    <div className="flex justify-between font-[family-name:var(--font-jetbrains)] text-[8px] text-zinc-600 uppercase mb-2">
                                        <span>Latency Buffer</span>
                                        <span>42ms</span>
                                    </div>
                                    <div className="w-full h-1 bg-zinc-900 relative">
                                        <div className="absolute left-0 top-0 h-full w-[42%] bg-orange-500/50"></div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 10. Landing Page Hero */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">10 // Web Hero Mockup</h2>
        <div className="w-full aspect-[16/10] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
            <nav className="p-6 flex justify-between items-center border-b border-zinc-900">
                <div className="flex items-center gap-2">
                    <Mark size={24} className="text-orange-500" />
                    <Wordmark className="text-sm" />
                </div>
                <div className="flex gap-6 text-[10px] font-[family-name:var(--font-jetbrains)] text-zinc-500 uppercase tracking-[0.15em]">
                    <span className="text-white">Protocol</span>
                    <span>Github</span>
                    <span>Telemetry</span>
                    <span>Install</span>
                </div>
            </nav>
            <div className="flex-1 flex items-center justify-center p-20 relative overflow-hidden">
                <div className="absolute inset-0 [background-image:linear-gradient(to_bottom,transparent_0%,rgba(249,115,22,0.02)_100%)]"></div>
                <div className="text-center space-y-10 relative z-10">
                    <h3 className="text-5xl md:text-6xl font-bold tracking-tight">Precision Voice Routing.</h3>
                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
                        Direct your voice stream to any autonomous agent with 40ms latency and hardware-grade telemetry.
                    </p>
                    <div className="flex gap-4 justify-center pt-4">
                        <div className="px-10 py-4 bg-orange-500 text-white font-bold uppercase tracking-[0.2em] text-[10px]">Open Console</div>
                        <div className="px-10 py-4 border border-zinc-800 text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">Read Docs</div>
                    </div>
                </div>
                {/* Visual hardware element */}
                <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-4/5 h-64 bg-[#121214] border-x border-t border-zinc-800 rounded-t-2xl p-6 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)]">
                    <div className="w-full h-full border border-zinc-900 rounded-t-xl flex p-8 gap-12">
                        <div className="w-24 border-r border-zinc-900 flex flex-col justify-between">
                            <div className="space-y-1">
                                {[...Array(12)].map((_, i) => (
                                    <div key={i} className={`h-1 w-full ${i > 8 ? 'bg-orange-500/20' : 'bg-zinc-900'}`}></div>
                                ))}
                            </div>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-zinc-600 uppercase">Master_Out</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-2">
                            <div className="flex justify-between items-center opacity-30">
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded bg-zinc-900"></div>
                                    <div className="w-8 h-8 rounded bg-zinc-900"></div>
                                    <div className="w-8 h-8 rounded bg-zinc-900"></div>
                                </div>
                                <div className="h-px flex-1 bg-zinc-900 mx-4"></div>
                                <div className="w-20 h-8 rounded bg-orange-500/10 border border-orange-500/20"></div>
                            </div>
                            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-orange-500/50"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 11. Docs Mockup */}
      <section className="py-32 px-8 md:px-20 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">11 // Documentation Mockup</h2>
        <div className="w-full aspect-[16/10] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden flex shadow-2xl">
            <aside className="w-64 border-r border-zinc-900 p-8 flex flex-col gap-10">
                <div className="flex items-center gap-2">
                    <Mark size={20} className="text-orange-500" />
                    <Wordmark className="text-xs" />
                </div>
                <div className="space-y-6 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em]">
                    <div className="space-y-3">
                        <p className="text-zinc-700">Infrastructure</p>
                        <p className="text-white">Signal Path</p>
                        <p className="text-zinc-500">Routing Logic</p>
                        <p className="text-zinc-500">Telemetry</p>
                    </div>
                    <div className="space-y-3">
                        <p className="text-zinc-700">Protocol</p>
                        <p className="text-zinc-500">VCLW Over UDP</p>
                        <p className="text-zinc-500">Auth Handshake</p>
                        <p className="text-zinc-500">Encryption</p>
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-20 max-w-4xl">
                <div className="space-y-12">
                    <div className="space-y-4 border-b border-zinc-900 pb-12">
                        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] text-orange-500 tracking-[0.3em]">SPECIFICATION // SIGNAL_PATH</p>
                        <h4 className="text-5xl font-bold tracking-tight">The Precision Layer</h4>
                        <p className="text-xl text-zinc-500">
                            Unlike consumer assistants that treat voice as a black box, VoiceClaw exposes the raw signal path for governance and optimization.
                        </p>
                    </div>
                    
                    <div className="space-y-8">
                        <p className="leading-relaxed text-zinc-300">
                            The system is built on a <span className="text-white font-medium">Mixing Desk architecture</span>. Every incoming audio packet is an independent channel that can be metered, transformed, and routed to multiple models simultaneously. This enables high-fidelity orchestration of autonomous workflows without sacrificing technical visibility.
                        </p>
                        
                        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm font-[family-name:var(--font-jetbrains)] text-xs leading-relaxed">
                            <div className="flex justify-between mb-4 opacity-30">
                                <span>route_config.yaml</span>
                                <span>v1.1</span>
                            </div>
                            <code className="text-zinc-400 block">
                                <span className="text-orange-500">input:</span> capture_device_01<br/>
                                <span className="text-orange-500">gate:</span> VAD_active<br/>
                                <span className="text-orange-500">routes:</span><br/>
                                &nbsp;&nbsp;- <span className="text-orange-300">target:</span> openai/gpt-4o<br/>
                                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-orange-300">gain:</span> +2.0dB<br/>
                                &nbsp;&nbsp;- <span className="text-orange-300">target:</span> local/telemetry_log
                            </code>
                        </div>

                        <p className="leading-relaxed text-zinc-300">
                            By leveraging the <span className="text-white border-b border-zinc-800 pb-0.5">VCLW transport protocol</span>, we achieve sub-50ms round-trip latency, ensuring your agents respond with human-grade timing.
                        </p>
                    </div>
                </div>
            </main>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 md:px-20 border-t border-zinc-800 text-center opacity-30">
        <Mark size={48} className="mx-auto mb-8 text-zinc-700" />
        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.4em] uppercase">
            VoiceClaw Infrastructure / Internal Brand Specification v1.1.0-C
        </p>
      </footer>
    </div>
  );
}

function ColorSwatch({ name, hex, oklch, usage }: { name: string, hex: string, oklch: string, usage: string }) {
  return (
    <div className="space-y-4">
      <div 
        className="aspect-video w-full border border-zinc-800 flex items-end p-4 group"
        style={{ backgroundColor: hex }}
      >
        <div className="bg-black/80 backdrop-blur-sm p-2 text-[10px] font-[family-name:var(--font-jetbrains)] opacity-0 group-hover:opacity-100 transition-opacity">
            {oklch}
        </div>
      </div>
      <div>
        <h4 className="font-bold text-white tracking-tight">{name}</h4>
        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40 uppercase tracking-widest mt-1">{hex}</p>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{usage}</p>
      </div>
    </div>
  );
}

function IconItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 border border-zinc-900 hover:border-zinc-800 transition-colors group bg-zinc-950/40 rounded-sm">
      <div className="text-zinc-600 group-hover:text-orange-500 transition-all duration-300 group-hover:scale-110">
        {icon}
      </div>
      <span className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}
