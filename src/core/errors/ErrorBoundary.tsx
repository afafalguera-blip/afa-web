import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportarError } from './reporter';

interface Props {
  children: ReactNode;
  /** Nombre de la zona, para saber en el panel qué parte reventó. */
  zona?: string;
  fallback?: ReactNode;
}

interface State {
  fallo: boolean;
}

/**
 * Última red antes de la pantalla en blanco.
 *
 * Sin esto, cualquier excepción durante el render desmonta el árbol entero de
 * React y la familia se queda mirando un fondo vacío, sin saber si es su móvil
 * o la web. Con esto ve un mensaje, tiene un botón para reintentar, y nosotros
 * nos enteramos.
 *
 * Tiene que ser una clase: `componentDidCatch` no tiene equivalente en hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportarError('render', error, {
      source: this.props.zona ?? info.componentStack?.trim().split('\n')[0] ?? null,
    });
  }

  private reintentar = () => {
    this.setState({ fallo: false });
  };

  render() {
    if (!this.state.fallo) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="min-h-[60vh] flex items-center justify-center px-4 py-12 text-center"
      >
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold text-neutral-900">
            Aquesta pàgina ha deixat de funcionar
          </h1>
          <p className="text-sm text-neutral-600">
            Ja ho hem registrat i hi estem treballant. Pots tornar-ho a provar o anar a l'inici.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.reintentar}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              Tornar-ho a provar
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700"
            >
              Anar a l'inici
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
