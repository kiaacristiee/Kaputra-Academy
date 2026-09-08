export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-slate-800 rounded-xl"></div>
        <div className="h-10 w-32 bg-slate-800 rounded-xl"></div>
      </div>
      <div className="h-12 w-full bg-slate-900 rounded-2xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-slate-900 rounded-3xl"></div>
        <div className="h-48 bg-slate-900 rounded-3xl"></div>
        <div className="h-48 bg-slate-900 rounded-3xl"></div>
      </div>
    </div>
  );
}
