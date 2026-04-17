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
        
        {/* Corner Metadata */}
        <div className="absolute top-0 left-0 p-8 font-[family-name:var(--font-jetbrains)] text-[10px] text-zinc-600 uppercase tracking-widest space-y-1">
            <p>REF: VC_MANUAL_003</p>
            <p>LOC: {new Date().toISOString().split('T')[0]}</p>
        </div>

        <div className="absolute top-0 right-0 p-8 flex gap-4 opacity-40">
            <div className="px-3 py-4 border border-zinc-800 flex flex-col items-center justify-between gap-2 bg-zinc-900/20">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-1/2 bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px]">CH-1</span>
            </div>
            <div className="px-3 py-4 border border-zinc-800 flex flex-col items-center justify-between gap-2 bg-zinc-900/20">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-2/3 bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px]">CH-2</span>
            </div>
            <div className="px-3 py-4 border border-orange-500/30 flex flex-col items-center justify-between gap-2 bg-orange-500/5">
                <div className="w-1 h-8 bg-zinc-800 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full h-1/4 bg-orange-500"></div>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[8px] text-orange-500">MST</span>
            </div>
        </div>
        
        <div className="space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-4 px-3 py-1 border border-zinc-800 bg-zinc-900/50 rounded-sm">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-widest uppercase opacity-60">System Ready // Signal Detected</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl tracking-tighter leading-none">
            <Wordmark className="text-white" />
          </h1>
          
          <p className="text-2xl md:text-3xl font-[family-name:var(--font-fraunces)] text-zinc-400 italic">
            The precise voice interface for autonomous agents.
          </p>
          
          <div className="pt-12 border-t border-zinc-800 mt-12">
            <p className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">Thesis 003: Instrument Panel</p>
            <p className="text-lg leading-relaxed max-w-2xl text-zinc-300">
              VoiceClaw is a utility, not a destination. It is a control surface for the mind. We treat voice as a high-fidelity data stream, providing the routing, metering, and precision controls required by technical power-users. The brand is the mixing desk: functional, industrial, and quietly confident.
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
            <h3 className="text-4xl tracking-tight">The Abstract Grip</h3>
            <p className="text-zinc-400 max-w-md">
              Rejecting the literal talon, our mark represents precision enclosure and focus. It is the visual equivalent of a microphone shock mount or a camera rig—tools that stabilize and focus raw energy into usable data.
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
                <Mark size={300} className="text-orange-500 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-0 left-0 w-full h-full border border-orange-500/20 scale-150"></div>
            </div>
        </div>
      </section>

      {/* 3. Color System */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">03 // Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorSwatch name="Industrial Black" hex="#121214" oklch="oklch(22% 0.01 260)" usage="Primary Background" />
          <ColorSwatch name="Signal Orange" hex="#F97316" oklch="oklch(67% 0.22 38)" usage="Primary Accent / Active" />
          <ColorSwatch name="Ghost White" hex="#F4F4F5" oklch="oklch(96% 0.01 252)" usage="Primary Text / Highlights" />
          <ColorSwatch name="Zinc Secondary" hex="#71717A" oklch="oklch(53% 0.01 262)" usage="Secondary Labels" />
        </div>
      </section>

      {/* 4. Typography */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">04 // Typography</h2>
        <div className="space-y-24">
            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">DISPLAY / GEIST SANS BOLD</p>
                    <h4 className="text-8xl tracking-tighter uppercase font-bold">Precision</h4>
                </div>
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">BODY / GEIST SANS REGULAR</p>
                    <p className="text-2xl leading-relaxed text-zinc-300">
                        The interface is the utility. We prioritize legibility and strict information hierarchy above all else.
                    </p>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">SERIF / FRAUNCES ITALIC</p>
                    <h4 className="text-6xl font-[family-name:var(--font-fraunces)] italic">Quiet Confidence</h4>
                </div>
                <div className="space-y-4">
                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40">MONO / JETBRAINS MONO</p>
                    <p className="font-[family-name:var(--font-jetbrains)] text-xl text-orange-500">
                        SYSTEM.INPUT = VOICE_STREAM
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* 5. Iconography */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">05 // Iconography</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8">
            <IconItem icon={<IconMic />} label="Mic" />
            <IconItem icon={<IconWaveform />} label="Waveform" />
            <IconItem icon={<IconBrain />} label="Brain" />
            <IconItem icon={<IconConnection />} label="Connect" />
            <IconItem icon={<IconSettings />} label="Settings" />
            <IconItem icon={<IconRouting />} label="Routing" />
            <IconItem icon={<IconMeter />} label="Meter" />
            <IconItem icon={<IconGain />} label="Gain" />
        </div>
      </section>

      {/* 6 & 7. App Icons */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">06-07 // App Contexts</h2>
        <div className="grid md:grid-cols-2 gap-20">
            {/* iOS */}
            <div className="space-y-8">
                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] opacity-40 uppercase tracking-widest">Mobile / iOS Environment</p>
                <div className="aspect-square bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative p-12 flex flex-col items-center justify-center">
                    <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
                    <div className="w-32 h-32 bg-black rounded-[22%] shadow-2xl border border-zinc-700 flex items-center justify-center mb-8 relative z-10">
                        <Mark size={80} className="text-orange-500" />
                    </div>
                    <div className="text-center z-10">
                        <p className="font-bold text-lg">VoiceClaw</p>
                        <p className="text-zinc-500 text-sm">v1.2.0-stable</p>
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
                        <p className="text-6xl font-bold opacity-10 font-[family-name:var(--font-jetbrains)] uppercase">DOCK_PREVIEW</p>
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
                    <p className="text-orange-500 font-medium">Professional AI Voice Interface</p>
                </div>
                <div className="flex gap-8 border-y border-zinc-800 py-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Rating</p>
                        <p className="font-bold">4.9 ★</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Age</p>
                        <p className="font-bold">17+</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Category</p>
                        <p className="font-bold">Developer Tools</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-[9/19] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative">
                         <div className="h-4 w-20 bg-zinc-800 rounded-full mb-8"></div>
                         <div className="space-y-4">
                            <div className="h-2 w-full bg-zinc-800 rounded"></div>
                            <div className="h-2 w-3/4 bg-zinc-800 rounded"></div>
                            <div className="aspect-square w-full border border-zinc-800 flex items-center justify-center">
                                <IconMeter />
                            </div>
                         </div>
                    </div>
                    <div className="aspect-[9/19] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative">
                        <div className="h-4 w-20 bg-zinc-800 rounded-full mb-8"></div>
                         <div className="flex flex-col h-full justify-between pb-8">
                            <div className="h-40 w-full bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center">
                                <IconWaveform />
                            </div>
                            <div className="w-full h-12 bg-zinc-800 rounded-full"></div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 9. Mac App Store */}
      <section className="py-32 px-8 md:px-20 border-b border-zinc-800 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">09 // Mac App Store</h2>
        <div className="max-w-5xl mx-auto bg-[#1a1a1c] border border-white/5 rounded-xl overflow-hidden">
            <div className="h-10 bg-[#2a2a2c] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
            </div>
            <div className="p-12 flex gap-12">
                <div className="w-48 h-48 bg-black rounded-3xl flex-shrink-0 flex items-center justify-center border border-zinc-800 shadow-2xl">
                    <Mark size={100} className="text-orange-500" />
                </div>
                <div className="flex-1 space-y-8">
                    <div>
                        <h3 className="text-5xl font-bold tracking-tight">VoiceClaw for macOS</h3>
                        <p className="text-xl text-zinc-500">Professional Agent Command Center</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-2 bg-blue-600 rounded-full font-bold text-sm">GET</div>
                        <div className="px-6 py-2 border border-zinc-700 rounded-full font-bold text-sm">OPEN SOURCE</div>
                    </div>
                    <div className="aspect-video w-full bg-black border border-zinc-800 rounded-lg relative p-8">
                         <div className="absolute top-4 left-4 font-[family-name:var(--font-jetbrains)] text-[10px] text-zinc-600">VOICECLAW_MD_VIEW_v1.2</div>
                         <div className="w-full h-full flex flex-col justify-between">
                            <div className="flex justify-between border-b border-zinc-900 pb-4">
                                <div className="flex gap-4">
                                    <div className="w-4 h-4 bg-orange-500"></div>
                                    <div className="w-40 h-4 bg-zinc-900"></div>
                                </div>
                                <div className="w-20 h-4 bg-zinc-900"></div>
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-2/3 h-1 bg-zinc-900 relative">
                                    <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full border-4 border-black"></div>
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
        <div className="w-full aspect-[16/10] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
            <nav className="p-6 flex justify-between items-center border-b border-zinc-900">
                <div className="flex items-center gap-2">
                    <Mark size={24} className="text-orange-500" />
                    <Wordmark className="text-sm" />
                </div>
                <div className="flex gap-6 text-xs font-[family-name:var(--font-jetbrains)] text-zinc-500 uppercase tracking-tighter">
                    <span className="text-white">Documentation</span>
                    <span>Github</span>
                    <span>Blog</span>
                    <span>Download</span>
                </div>
            </nav>
            <div className="flex-1 flex items-center justify-center p-20 relative overflow-hidden">
                <div className="absolute inset-0 [background-image:linear-gradient(to_bottom,transparent_0%,rgba(249,115,22,0.03)_100%)]"></div>
                <div className="text-center space-y-8 relative z-10">
                    <h3 className="text-8xl font-bold tracking-tighter">THE MIXING DESK FOR AI.</h3>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-[family-name:var(--font-fraunces)] italic">
                        Route your voice to any LLM with 20ms latency and professional-grade telemetry.
                    </p>
                    <div className="flex gap-4 justify-center pt-8">
                        <div className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs">Deploy Agent</div>
                        <div className="px-8 py-3 border border-zinc-800 font-bold uppercase tracking-widest text-xs">Read Protocol</div>
                    </div>
                </div>
                <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-2/3 h-80 bg-zinc-900 border border-zinc-800 rounded-t-3xl p-8">
                    <div className="w-full h-full border border-zinc-800 rounded-t-xl opacity-20 flex p-8 gap-8">
                        <div className="flex-1 border-r border-zinc-800 flex flex-col justify-end gap-2">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="h-1 bg-zinc-800" style={{ width: `${Math.random() * 100}%` }}></div>
                            ))}
                        </div>
                        <div className="flex-1 border-r border-zinc-800 flex flex-col justify-end gap-2">
                             {[...Array(12)].map((_, i) => (
                                <div key={i} className={`h-1 ${i > 8 ? 'bg-orange-500' : 'bg-zinc-800'}`} style={{ width: `${Math.random() * 100}%` }}></div>
                            ))}
                        </div>
                        <div className="flex-1 border-r border-zinc-800"></div>
                        <div className="flex-1"></div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 11. Docs Mockup */}
      <section className="py-32 px-8 md:px-20 bg-zinc-950/20">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-widest text-orange-500 mb-12">11 // Documentation Mockup</h2>
        <div className="w-full aspect-[16/10] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden flex">
            <aside className="w-64 border-r border-zinc-900 p-8 flex flex-col gap-8">
                <div className="flex items-center gap-2">
                    <Mark size={20} className="text-orange-500" />
                    <Wordmark className="text-xs" />
                </div>
                <div className="space-y-4 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest">
                    <div className="space-y-2">
                        <p className="text-zinc-600">Foundation</p>
                        <p className="text-white">Introduction</p>
                        <p className="text-zinc-500">Quick Start</p>
                        <p className="text-zinc-500">Core Concepts</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-zinc-600">Routing</p>
                        <p className="text-zinc-500">Websocket API</p>
                        <p className="text-zinc-500">Latency Buffer</p>
                        <p className="text-zinc-500">Encryption</p>
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-20 max-w-4xl">
                <div className="space-y-12">
                    <div className="space-y-4 border-b border-zinc-900 pb-12">
                        <p className="font-[family-name:var(--font-jetbrains)] text-[10px] text-orange-500 tracking-[0.3em]">CORE_CONCEPTS // 01</p>
                        <h4 className="text-6xl font-bold tracking-tight">The Precision Layer</h4>
                        <p className="text-xl text-zinc-400 font-[family-name:var(--font-fraunces)] italic">
                            Unlike traditional assistants that treat voice as a black box, VoiceClaw exposes the raw signal path.
                        </p>
                    </div>
                    
                    <div className="space-y-8">
                        <p className="leading-relaxed text-zinc-300">
                            The system is built on a "Mixing Desk" philosophy. Every incoming audio packet is treated as an independent channel that can be metered, transformed, and routed to multiple agent brains simultaneously. This allows for high-fidelity orchestration of autonomous workflows without the overhead of heavy UI abstractions.
                        </p>
                        
                        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded font-[family-name:var(--font-jetbrains)] text-sm">
                            <div className="flex justify-between mb-4 opacity-40">
                                <span>example_routing.ts</span>
                                <span>TypeScript</span>
                            </div>
                            <code className="text-zinc-400">
                                <span className="text-orange-500">const</span> signal = <span className="text-orange-500">await</span> VoiceClaw.capture();<br/>
                                <span className="text-orange-500">await</span> signal.route(<span className="text-orange-300">"openai-gpt-4o"</span>, &#123; gain: <span className="text-blue-400">1.2</span> &#125;);
                            </code>
                        </div>

                        <p className="leading-relaxed text-zinc-300">
                            By leveraging the <span className="text-white border-b border-zinc-800 pb-0.5">low-latency transport protocol</span>, we achieve sub-50ms response times even on saturated networks.
                        </p>
                    </div>
                </div>
            </main>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 md:px-20 border-t border-zinc-800 text-center opacity-40">
        <Mark size={48} className="mx-auto mb-8 text-zinc-700" />
        <p className="font-[family-name:var(--font-jetbrains)] text-xs tracking-widest uppercase">
            VoiceClaw Instrument Panel / Internal Brand Manual v1.0.0-C
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
        <h4 className="font-bold text-white">{name}</h4>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs opacity-60 uppercase tracking-tighter">{hex}</p>
        <p className="text-xs text-zinc-500 mt-1">{usage}</p>
      </div>
    </div>
  );
}

function IconItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 border border-zinc-900 hover:border-zinc-700 transition-colors group bg-zinc-950/40">
      <div className="text-zinc-400 group-hover:text-orange-500 transition-colors scale-125">
        {icon}
      </div>
      <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}
