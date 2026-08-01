const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/student/mock-test/MockTestClient.tsx', 'utf8');

// The active test container:
code = code.replace(
  /<div className="max-w-4xl mx-auto">/,
  '<div className="max-w-[900px] mx-auto bg-[#090E17] p-8 md:p-12 rounded-[40px] shadow-2xl">'
);

// Top header styling
code = code.replace(
  /<div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800\\\/40">/,
  '<div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">'
);

code = code.replace(
  /<h3 className="font-extrabold text-white text-2xl truncate">quiz<\/h3>/,
  '<h3 className="font-black text-white text-2xl tracking-wide">quiz</h3>'
);

// Exit button
code = code.replace(
  /className="text-slate-400 hover:text-white flex items-center gap-1\.5 px-3 py-1\.5"/,
  'className="bg-[#1E293B]/50 hover:bg-[#1E293B] text-slate-300 hover:text-white rounded-xl px-5 py-2.5 h-auto text-[13px] font-bold"'
);

// Main Question Box
code = code.replace(
  /<div className="bg-\[\#121827\] border border-slate-800\\\/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">/,
  '<div className="bg-[#111827] border border-slate-800/80 rounded-[32px] p-8 md:p-10 shadow-xl">'
);

// Questions nav items:
code = code.replace(
  /className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all \${/g,
  'className={`w-11 h-11 rounded-xl text-sm font-black flex items-center justify-center transition-all ${'
);

// Answer Option normal mode (remove A/B/C/D)
code = code.replace(
  /<span className={`w-\[26px\] h-\[26px\] rounded-full border flex items-center justify-center text-\[11px\] font-bold shrink-0 transition-colors \${[\s\S]*?isSelected \? "border-\[\#D89A2B\] bg-\[\#D89A2B\] text-black" : "border-slate-600\\\/70 text-slate-400"[\s\S]*?}`}>[\s\S]*?\{String\.fromCharCode\(65 \+ i\)\}[\s\S]*?<\/span>/g,
  ''
);

// Result checkmark
code = code.replace(
  /<div className="w-\[100px\] h-\[100px\] rounded-full flex items-center justify-center bg-\[\#07241C\] border-\[3px\] border-\[\#0E3D31\] shadow-\[0_0_50px_rgba\(16,185,129,0\.05\)\]">/,
  '<div className="w-[110px] h-[110px] rounded-full flex items-center justify-center bg-[#07241C] border-[4px] border-[#0E3D31] shadow-[0_0_60px_rgba(16,185,129,0.15)]">'
);

code = code.replace(
  /<Check className="w-\[45px\] h-\[45px\] text-\[\#2DD4BF\]" strokeWidth=\{2\.5\} \/>/,
  '<Check className="w-[50px] h-[50px] text-[#2DD4BF]" strokeWidth={3} />'
);

code = code.replace(
  /<h2 className="text-\[64px\] font-black text-white leading-none tracking-tight">\{testResult\.score\}%<\/h2>/,
  '<h2 className="text-[72px] font-black text-white leading-none tracking-tighter">{testResult.score}%</h2>'
);


fs.writeFileSync('src/app/(dashboard)/student/mock-test/MockTestClient.tsx', code);
console.log("Replaced");
