import { supabase } from '../../lib/supabase';

/** Una ocurrencia concreta. */
export interface ClientError {
  id: string;
  created_at: string;
  fingerprint: string;
  kind: 'render' | 'window' | 'promise' | 'manual';
  message: string;
  stack: string | null;
  source: string | null;
  page_url: string | null;
  user_agent: string | null;
  app_version: string | null;
  user_id: string | null;
  resolved_at: string | null;
}

/** Un grupo: el mismo fallo reportado por muchas visitas. */
export interface ClientErrorGroup {
  fingerprint: string;
  kind: string;
  message: string;
  veces: number;
  afectados: number;
  primera_vez: string;
  ultima_vez: string;
  resueltos: number;
}

export const AdminClientErrorsService = {
  /**
   * Resumen agrupado por huella. Va por RPC porque PostgREST no sabe agrupar, y
   * traerse las filas para contarlas en el navegador sería absurdo cuando un
   * solo fallo puede tener miles.
   */
  async listarGrupos(dias = 7): Promise<ClientErrorGroup[]> {
    const { data, error } = await supabase.rpc('client_errors_resumen', { p_dias: dias });
    if (error) throw error;
    return (data || []) as ClientErrorGroup[];
  },

  /** Ocurrencias de un grupo, de la más reciente a la más antigua. */
  async listarOcurrencias(fingerprint: string, limite = 20): Promise<ClientError[]> {
    const { data, error } = await supabase
      .from('client_errors')
      .select('*')
      .eq('fingerprint', fingerprint)
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data || []) as unknown as ClientError[];
  },

  /** Cuántos grupos sin resolver hay, para el aviso del menú. */
  async contarSinResolver(dias = 7): Promise<number> {
    const grupos = await this.listarGrupos(dias);
    return grupos.filter((g) => g.resueltos < g.veces).length;
  },

  /** Marca (o desmarca) todo un grupo como resuelto. */
  async marcarResuelto(fingerprint: string, resuelto: boolean): Promise<void> {
    const { error } = await supabase
      .from('client_errors')
      .update({ resolved_at: resuelto ? new Date().toISOString() : null })
      .eq('fingerprint', fingerprint);
    if (error) throw error;
  },

  async borrarGrupo(fingerprint: string): Promise<void> {
    const { error } = await supabase.from('client_errors').delete().eq('fingerprint', fingerprint);
    if (error) throw error;
  },
};
