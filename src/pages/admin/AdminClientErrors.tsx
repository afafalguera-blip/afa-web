import { useCallback, useEffect, useState } from 'react';
import { Bug, Check, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AdminClientErrorsService,
  type ClientError,
  type ClientErrorGroup,
} from '../../services/admin/AdminClientErrorsService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';

const RANGOS = [1, 7, 30, 90] as const;

const KIND_LABEL: Record<string, string> = {
  render: 'Render',
  window: 'JavaScript',
  promise: 'Promesa',
  manual: 'Manual',
};

function fecha(valor: string): string {
  return format(new Date(valor), 'dd/MM/yyyy HH:mm');
}

export default function AdminClientErrors() {
  const { toast } = useToast();

  const [dias, setDias] = useState<number>(7);
  const [grupos, setGrupos] = useState<ClientErrorGroup[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState<ClientErrorGroup | null>(null);
  const [ocurrencias, setOcurrencias] = useState<ClientError[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setGrupos(await AdminClientErrorsService.listarGrupos(dias));
    } catch (err) {
      console.error(err);
      toast.error('No s\'han pogut carregar els errors.');
    } finally {
      setCargando(false);
    }
  }, [dias, toast]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = async (grupo: ClientErrorGroup) => {
    setAbierto(grupo);
    setOcurrencias([]);
    try {
      setOcurrencias(await AdminClientErrorsService.listarOcurrencias(grupo.fingerprint));
    } catch (err) {
      console.error(err);
    }
  };

  const alternarResuelto = async (grupo: ClientErrorGroup) => {
    const resuelto = grupo.resueltos >= grupo.veces;
    try {
      await AdminClientErrorsService.marcarResuelto(grupo.fingerprint, !resuelto);
      toast.success(resuelto ? 'Marcat com a pendent.' : 'Marcat com a resolt.');
      setAbierto(null);
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error('No s\'ha pogut actualitzar.');
    }
  };

  const borrar = async (grupo: ClientErrorGroup) => {
    try {
      await AdminClientErrorsService.borrarGrupo(grupo.fingerprint);
      toast.success('Errors esborrats.');
      setAbierto(null);
      await cargar();
    } catch (err) {
      console.error(err);
      toast.error('No s\'ha pogut esborrar.');
    }
  };

  const pendientes = grupos.filter((g) => g.resueltos < g.veces);

  return (
    <div className="max-w-6xl mx-auto">
      <AdminPageHeader
        title="Errors del navegador"
        subtitle="Pantalles que han petat a l'ordinador o al mòbil d'algú."
        icon={Bug}
        actions={
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            {RANGOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDias(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  dias === r ? 'bg-white text-primary shadow-sm' : 'text-neutral-500'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      />

      {!cargando && grupos.length === 0 && (
        <div className="bg-white rounded-3xl border border-neutral-100 p-12 text-center">
          <Check className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-semibold text-neutral-900">Cap error en aquest període</p>
          <p className="text-sm text-neutral-500 mt-1">
            Si això es manté buit dies seguits, comprova que el reporte funciona.
          </p>
        </div>
      )}

      {grupos.length > 0 && (
        <>
          <p className="text-sm text-neutral-500 mb-3">
            {pendientes.length} sense resoldre de {grupos.length} en {dias} dies.
          </p>

          <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Error</th>
                    <th className="text-left font-semibold px-5 py-3">Tipus</th>
                    <th className="text-right font-semibold px-5 py-3">Cops</th>
                    <th className="text-right font-semibold px-5 py-3">Afectats</th>
                    <th className="text-left font-semibold px-5 py-3">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((grupo) => {
                    const resuelto = grupo.resueltos >= grupo.veces;
                    return (
                      <tr
                        key={grupo.fingerprint}
                        onClick={() => void abrir(grupo)}
                        className="border-t border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                      >
                        <td className="px-5 py-3 max-w-md">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                resuelto ? 'bg-neutral-300' : 'bg-red-500'
                              }`}
                            />
                            <span className="truncate text-neutral-900">{grupo.message}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-neutral-500">
                          {KIND_LABEL[grupo.kind] ?? grupo.kind}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{grupo.veces}</td>
                        <td className="px-5 py-3 text-right">{grupo.afectados}</td>
                        <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">
                          {fecha(grupo.ultima_vez)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={abierto !== null}
        onClose={() => setAbierto(null)}
        title={abierto?.message ?? ''}
        size="xl"
        footer={
          abierto && (
            <>
              <button
                type="button"
                onClick={() => void borrar(abierto)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Esborrar
              </button>
              <button
                type="button"
                onClick={() => void alternarResuelto(abierto)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2"
              >
                {abierto.resueltos >= abierto.veces ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Tornar a pendent
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Marcar resolt
                  </>
                )}
              </button>
            </>
          )
        }
      >
        {abierto && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-neutral-500">Tipus</dt>
                <dd className="font-semibold">{KIND_LABEL[abierto.kind] ?? abierto.kind}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Cops</dt>
                <dd className="font-semibold">
                  {abierto.veces} · {abierto.afectados} afectats
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Primera vegada</dt>
                <dd>{fecha(abierto.primera_vez)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Última vegada</dt>
                <dd>{fecha(abierto.ultima_vez)}</dd>
              </div>
            </dl>

            {ocurrencias.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  Últimes {ocurrencias.length} ocurrències
                </p>
                {ocurrencias.slice(0, 3).map((oc) => (
                  <div key={oc.id} className="rounded-lg border border-neutral-200 p-3 space-y-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-500">
                      <span>{fecha(oc.created_at)}</span>
                      {oc.page_url && <span className="truncate max-w-xs">{oc.page_url}</span>}
                      {oc.app_version && <span>v{oc.app_version}</span>}
                    </div>
                    {oc.stack && (
                      <pre className="text-[11px] bg-neutral-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                        {oc.stack}
                      </pre>
                    )}
                    {oc.user_agent && (
                      <p className="text-[11px] text-neutral-400 truncate">{oc.user_agent}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
