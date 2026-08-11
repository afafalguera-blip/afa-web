import { Link } from 'react-router-dom';

/**
 * Ruta comodín.
 *
 * `vercel.json` reescribe todas las URLs a index.html para que funcione el
 * router del navegador. Sin un `<Route path="*">`, cualquier dirección que no
 * case — un enlace viejo de una circular, una errata al teclear — no encontraba
 * ninguna ruta y React Router no pintaba nada: pantalla en blanco, sin ningún
 * error, sin forma de volver.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-5xl font-bold text-neutral-300">404</p>
        <h1 className="text-xl font-semibold text-neutral-900">Aquesta pàgina no existeix</h1>
        <p className="text-sm text-neutral-600">
          Potser l'enllaç és antic o hi ha una errata a l'adreça.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            Anar a l'inici
          </Link>
        </div>
      </div>
    </div>
  );
}
