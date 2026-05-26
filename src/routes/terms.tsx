import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-8 py-10">
        <Link
          to="/"
          className="text-xs text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition"
        >
          ← Inicio
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0c0c0b] dark:text-[#f0ede8]">
          Términos del servicio
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[#a0a09c]">
          Última actualización: 26 de mayo de 2026
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-gray-700 dark:text-[#d4d2cd] leading-relaxed">
          <Section title="1. Aceptación de los términos">
            <p>
              Al crear una cuenta en Welist o usar la web{" "}
              <strong>welist.io</strong> o la aplicación móvil “Welist” (en
              adelante, el “Servicio”), aceptas estos Términos y nuestra{" "}
              <Link
                to="/privacy"
                className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
              >
                Política de privacidad
              </Link>
              . Si no estás de acuerdo, no uses el Servicio.
            </p>
          </Section>

          <Section title="2. Descripción del Servicio">
            <p>
              Welist es una herramienta para crear, compartir y colaborar en
              listas (películas, libros, sitios, planes, etc.). Algunas
              funciones permiten hacer públicas tus listas y aceptar
              colaboradores o retadores.
            </p>
          </Section>

          <Section title="3. Cuenta">
            <p>
              Debes tener al menos 13 años para usar Welist. Eres responsable
              de la actividad realizada con tu cuenta y de mantener tu
              contraseña en secreto. Puedes eliminar tu cuenta en cualquier
              momento desde Ajustes; la eliminación es permanente.
            </p>
          </Section>

          <Section title="4. Contenido de usuario">
            <p>
              Conservas la propiedad del contenido que publiques (listas,
              items, comentarios, valoraciones). Al publicarlo, nos otorgas una
              licencia mundial, no exclusiva y gratuita para alojarlo, mostrarlo
              y distribuirlo dentro del Servicio.
            </p>
            <p>
              No puedes publicar contenido que:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Sea ilegal, fraudulento, difamatorio o engañoso.</li>
              <li>
                Contenga material sexualmente explícito, pornografía o
                contenido que sexualice a menores.
              </li>
              <li>Incite al odio, la violencia o la discriminación.</li>
              <li>
                Viole derechos de terceros, incluidos propiedad intelectual y
                privacidad.
              </li>
              <li>Contenga spam, phishing o software malicioso.</li>
              <li>Suplante la identidad de otra persona o entidad.</li>
            </ul>
            <p>
              Nos reservamos el derecho de eliminar contenido que infrinja
              estas reglas y de suspender o cerrar cuentas reincidentes.
            </p>
          </Section>

          <Section title="5. Moderación y reportes">
            <p>
              Puedes reportar contenido o usuarios que infrinjan estos Términos
              desde la propia app. Revisamos los reportes en un plazo razonable
              (objetivo: 24 horas) y tomamos las medidas que consideremos
              proporcionadas: ocultar contenido, advertir, suspender o
              eliminar la cuenta.
            </p>
          </Section>

          <Section title="6. Pagos y monetización (web)">
            <p>
              En la web, los creadores pueden conectar una cuenta de Stripe
              Connect para vender el acceso a sus listas. Welist actúa como
              plataforma y aplica una comisión sobre cada transacción. Los
              pagos están sujetos a los términos de Stripe. Los reembolsos
              dependen del creador.
            </p>
            <p>
              <strong>App móvil</strong>: en la app de iOS y Android la
              monetización está deshabilitada. Las compras se realizan solo en
              la web.
            </p>
          </Section>

          <Section title="7. Disponibilidad y cambios">
            <p>
              Hacemos esfuerzos razonables para mantener el Servicio
              disponible, pero no garantizamos una operación ininterrumpida.
              Podemos modificar, suspender o discontinuar funciones del
              Servicio en cualquier momento.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <p>
              El Servicio se proporciona “tal cual”, sin garantías de ningún
              tipo. En la máxima medida permitida por la ley, no seremos
              responsables de daños indirectos, incidentales, especiales o
              consecuentes derivados del uso del Servicio. Nuestra
              responsabilidad máxima frente a ti, en cualquier circunstancia,
              se limita a la cantidad que hayas pagado a Welist en los 12 meses
              anteriores al hecho que origina la reclamación (o cero, si no
              has hecho ningún pago).
            </p>
          </Section>

          <Section title="9. Indemnidad">
            <p>
              Aceptas indemnizar a Welist frente a cualquier reclamación
              derivada de tu uso del Servicio, del contenido que publiques o
              del incumplimiento de estos Términos.
            </p>
          </Section>

          <Section title="10. Terminación">
            <p>
              Puedes cerrar tu cuenta en cualquier momento. Podemos suspender o
              terminar tu acceso si infringes estos Términos o si la ley lo
              exige.
            </p>
          </Section>

          <Section title="11. Ley aplicable">
            <p>
              Estos Términos se rigen por la legislación española. Cualquier
              disputa se someterá a los juzgados y tribunales competentes
              según ley.
            </p>
          </Section>

          <Section title="12. Cambios en los Términos">
            <p>
              Podemos actualizar estos Términos. Si los cambios son
              sustanciales, te avisaremos por email o desde la app antes de
              que entren en vigor. El uso continuado del Servicio tras la
              entrada en vigor implica tu aceptación.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Para cualquier consulta sobre estos Términos, escríbenos a{" "}
              <a
                href="mailto:hola@welist.io"
                className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
              >
                hola@welist.io
              </a>
              .
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-gray-500 dark:text-[#a0a09c]">
          <Link
            to="/privacy"
            className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
          >
            Política de privacidad
          </Link>
        </p>
      </main>
      <AppFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
        {title}
      </h2>
      {children}
    </section>
  );
}
