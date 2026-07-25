"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, Download, Database, Chrome, Monitor, Terminal, Layers, ArrowRight, Zap, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WindowsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
  </svg>
);

const MacIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/>
  </svg>
);

const LinuxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.97 22.036c-1.897 0-3.153-1.054-4.04-1.708-.475-.353-.615-.472-.615-.472s-.42.062-.835.347c-.896.61-2.158 1.47-3.376.602-1.396-.995.143-3.61.143-3.61s-2.008-1.547-2.03-3.882c-.015-1.57.945-2.585 1.614-3.179-.537-2.154-1.442-5.748 1.03-8.291 1.848-1.898 4.417-1.83 5.46-1.83 1.042 0 3.611-.067 5.46 1.83 2.472 2.543 1.566 6.137 1.03 8.29.667.595 1.628 1.61 1.613 3.18-.023 2.335-2.03 3.881-2.03 3.881s1.538 2.615.143 3.61c-1.218.868-2.48.008-3.376-.602-.415-.285-.835-.347-.835-.347s-.14.12-.615.472c-.887.654-2.143 1.708-4.04 1.708"/>
  </svg>
);

export default function AIModelsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-32 pt-28 md:pt-36">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 relative z-10">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-6 border border-emerald-200 dark:border-emerald-800">
            <SparklesIcon className="w-4 h-4" /> Next-Gen Architecture
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 flex flex-col md:flex-row items-center justify-center gap-3 text-zinc-900 dark:text-white">
            <Cpu className="w-12 h-12 text-emerald-600 dark:text-emerald-500" />
            KahfNews <span className="text-emerald-600 dark:text-emerald-500">AI Models</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Discover the inner workings of our advanced neural networks. Download and integrate our raw AI models, datasets, and native apps for unparalleled audio processing.
          </p>
        </motion.div>

        {/* Visual Presentation Section (Model Architecture) */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-24"
        >
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden relative">
            {/* Visual background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl max-h-[400px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="text-center mb-12 relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">How Our Model Works</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
                A state-of-the-art transformer architecture designed to separate vocals and instruments with zero latency and high fidelity.
              </p>
            </div>

            {/* Architecture Diagram (CSS based aesthetic visual) */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 relative z-10 py-8">
              
              {/* Input Node */}
              <div className="flex flex-col items-center group">
                <div className="w-20 h-20 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:border-emerald-500 transition-colors z-10 relative">
                  <Play className="w-8 h-8 text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                </div>
                <span className="mt-4 font-semibold text-sm text-center">Raw News Video/Audio Input</span>
                <span className="text-xs text-zinc-500">Mixed news & noise</span>
              </div>

              <div className="hidden md:flex flex-1 max-w-[100px] h-0.5 bg-gradient-to-r from-zinc-300 to-emerald-500 dark:from-zinc-700 dark:to-emerald-500 relative">
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="md:hidden w-0.5 h-10 bg-gradient-to-b from-zinc-300 to-emerald-500 dark:from-zinc-700 dark:to-emerald-500 my-2" />

              {/* Neural Network Core */}
              <div className="relative group">
                {/* 3D-like layered effect */}
                <div className="absolute inset-0 bg-emerald-600/20 translate-x-2 translate-y-2 rounded-2xl blur-sm transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />
                <div className="absolute inset-0 bg-emerald-500/30 translate-x-1 translate-y-1 rounded-2xl transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5" />
                
                <div className="w-40 h-40 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex flex-col items-center justify-center shadow-2xl relative z-10 border border-emerald-300 dark:border-emerald-700 text-white p-4">
                  <Layers className="w-12 h-12 mb-3" />
                  <span className="font-bold text-center leading-tight">Band-Split<br/>RNN Model</span>
                </div>
                
                {/* Scanning line animation */}
                <motion.div 
                  className="absolute top-0 left-0 right-0 h-1 bg-white/50 blur-[1px] z-20 rounded-t-2xl"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <div className="hidden md:flex flex-1 max-w-[100px] h-0.5 bg-gradient-to-r from-emerald-500 to-zinc-300 dark:from-emerald-500 dark:to-zinc-700 relative">
                <motion.div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
                />
              </div>
              <div className="md:hidden w-0.5 h-10 bg-gradient-to-b from-emerald-500 to-zinc-300 dark:from-emerald-500 dark:to-zinc-700 my-2" />

              {/* Output Nodes */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-14 h-14 bg-white dark:bg-zinc-800 border-2 border-emerald-500 rounded-xl flex items-center justify-center shadow-lg relative">
                    <Zap className="w-6 h-6 text-emerald-600" />
                    <div className="absolute inset-0 bg-emerald-500/20 animate-ping rounded-xl" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">Natural Sound</div>
                    <div className="text-xs text-zinc-500">Filtered & isolated</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 group opacity-50">
                  <div className="w-14 h-14 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">🎵</span>
                  </div>
                  <div>
                    <div className="font-bold text-zinc-500">Music / Noise</div>
                    <div className="text-xs text-zinc-400">Removed entirely</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <h2 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-white">Downloads & Extensions</h2>

        {/* Downloads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Raw Model */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="h-full glass hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                  <Terminal className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl text-zinc-900 dark:text-white">Raw Sound Remover Model</CardTitle>
                <CardDescription className="text-zinc-500">Advanced neural network for separating vocals and instruments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span>Format</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">.onnx / .pt</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span>Size</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">1.2 GB</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span>Architecture</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">Transformer based</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-4 h-4" /> Request Model Access
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Dataset */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <Card className="h-full glass hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl text-zinc-900 dark:text-white">Training Dataset</CardTitle>
                <CardDescription className="text-zinc-500">Open-source dataset used to train the KahfNews AI models.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span>Format</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">.wav + JSON</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span>Size</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">45 GB</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span>License</span> <span className="font-mono text-zinc-900 dark:text-zinc-200">MIT Open Source</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button className="flex-1 gap-2 font-bold border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300" variant="outline">
                  View Demo Data
                </Button>
                <Button className="flex-1 gap-2 font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
                  <Download className="w-4 h-4" /> Get Dataset
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Chrome Extension */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <Card className="h-full glass hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md">
              <CardHeader>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-4">
                  <Chrome className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl text-zinc-900 dark:text-white">Chrome Web Extension</CardTitle>
                <CardDescription className="text-zinc-500">Filter background music directly in your browser.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  Seamlessly integrates with your browser. Uses our lightweight WebAssembly model to process audio locally, ensuring privacy and zero latency on YouTube, Spotify, and more.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold">
                  <Chrome className="w-4 h-4" /> Add to Chrome (Free)
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Desktop App */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <Card className="h-full glass hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-md">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                  <Monitor className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl text-zinc-900 dark:text-white">Kahf Sound Remover App</CardTitle>
                <CardDescription className="text-zinc-500">Native desktop application for bulk audio processing.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  Available for Windows, macOS, and Linux. Process gigabytes of audio using your system's GPU for maximum performance.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="group flex flex-col h-auto py-3 gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                    <WindowsIcon />
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-xs">Windows</span>
                      <span className="text-[9px] text-zinc-400 group-hover:text-emerald-500/70 transition-colors">.exe</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="group flex flex-col h-auto py-3 gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                    <MacIcon />
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-xs">Mac</span>
                      <span className="text-[9px] text-zinc-400 group-hover:text-emerald-500/70 transition-colors">.dmg</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="group flex flex-col h-auto py-3 gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
                    <LinuxIcon />
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-xs">Linux</span>
                      <span className="text-[9px] text-zinc-400 group-hover:text-emerald-500/70 transition-colors">.AppImage</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </main>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
