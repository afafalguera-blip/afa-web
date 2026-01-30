export default function ProjectsManager() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gestió de Projectes</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Nou Projecte
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        Pròximament: Gestió de fitxes de projectes de l'escola.
      </div>
    </div>
  );
}
