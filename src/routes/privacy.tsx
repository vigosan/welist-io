import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
          Política de privacidad
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[#a0a09c]">
          Última actualización: 26 de mayo de 2026
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm text-gray-700 dark:text-[#d4d2cd] leading-relaxed">
          <Section title="1. Responsable del tratamiento">
            <p>
              El responsable del tratamiento de tus datos personales es Vicent
              Gozalbes (en adelante, “Welist”), titular del sitio web{" "}
              <strong>welist.io</strong> y de la aplicación móvil “Welist”.
            </p>
            <p>
              Puedes contactar con nosotros en{" "}
              <a
                href="mailto:hola@welist.io"
                className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
              >
                hola@welist.io
              </a>
              .
            </p>
          </Section>

          <Section title="2. Qué datos recogemos">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Datos de cuenta</strong>: email, nombre, imagen de
                perfil (cuando inicias sesión con Google o Apple).
              </li>
              <li>
                <strong>Contraseña</strong>: si decides crear una contraseña,
                guardamos solo un hash (no la contraseña en claro).
              </li>
              <li>
                <strong>Contenido de usuario</strong>: las listas, items,
                comentarios, valoraciones y demás contenido que crees o
                publiques en Welist.
              </li>
              <li>
                <strong>Datos de uso</strong>: información técnica del
                dispositivo (IP, navegador, sistema operativo) recogida por
                nuestros proveedores de infraestructura.
              </li>
              <li>
                <strong>Notificaciones</strong>: tu preferencia para recibir o
                no recordatorios por email.
              </li>
            </ul>
          </Section>

          <Section title="3. Para qué usamos tus datos">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Identificarte y permitirte acceder a tu cuenta.</li>
              <li>Mostrar tu contenido y permitir interactuar con otros usuarios.</li>
              <li>
                Enviarte notificaciones operativas (resultados de pago, cambios
                en tu cuenta) y, si lo aceptas, recordatorios periódicos.
              </li>
              <li>Detectar y prevenir abusos, fraude y violaciones de los términos.</li>
              <li>Cumplir con obligaciones legales.</li>
            </ul>
            <p>
              <strong>Base legal (GDPR)</strong>: ejecución del contrato
              (cuenta y servicio), consentimiento (notificaciones por email,
              perfil público), interés legítimo (seguridad y mejora del
              servicio).
            </p>
          </Section>

          <Section title="4. Con quién los compartimos">
            <p>
              Solo compartimos tus datos con los procesadores estrictamente
              necesarios para operar el servicio:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Vercel Inc.</strong> (EE. UU.) — hosting de la web y la
                API.
              </li>
              <li>
                <strong>Neon Inc.</strong> (EE. UU.) — base de datos
                PostgreSQL.
              </li>
              <li>
                <strong>Google LLC</strong> y <strong>Apple Inc.</strong> — para
                el inicio de sesión OAuth.
              </li>
              <li>
                <strong>Stripe, Inc.</strong> (EE. UU.) — procesamiento de
                pagos cuando un creador conecta su cuenta para monetizar listas
                (solo en la web).
              </li>
              <li>
                <strong>Resend, Inc.</strong> (EE. UU.) — envío de emails
                transaccionales.
              </li>
            </ul>
            <p>
              Todos los procesadores fuera del EEE cuentan con cláusulas
              contractuales tipo (SCC) o salvaguardas equivalentes para las
              transferencias internacionales de datos.
            </p>
          </Section>

          <Section title="5. Cuánto tiempo guardamos los datos">
            <p>
              Mantenemos tus datos mientras tu cuenta esté activa. Cuando
              eliminas tu cuenta (desde Ajustes en la app o la web), borramos
              de forma permanente tu perfil, tus listas y demás contenido
              asociado. Algunas obligaciones legales (contabilidad fiscal en el
              caso de transacciones) pueden requerir conservar registros
              específicos durante el plazo legal aplicable.
            </p>
          </Section>

          <Section title="6. Tus derechos">
            <p>
              Si estás en el Espacio Económico Europeo o en el Reino Unido,
              tienes derecho a:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Acceder a tus datos personales.</li>
              <li>Solicitar su rectificación.</li>
              <li>Solicitar su supresión (puedes hacerlo tú mismo desde Ajustes).</li>
              <li>Limitar u oponerte al tratamiento.</li>
              <li>Portabilidad de tus datos.</li>
              <li>
                Retirar el consentimiento (afecta solo a futuro), por ejemplo
                desactivando los emails de recordatorio en Ajustes.
              </li>
              <li>
                Presentar una reclamación ante la autoridad de control
                competente (en España, la AEPD).
              </li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escríbenos a{" "}
              <a
                href="mailto:hola@welist.io"
                className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
              >
                hola@welist.io
              </a>
              .
            </p>
          </Section>

          <Section title="7. Cookies (solo web)">
            <p>
              La web utiliza únicamente cookies estrictamente necesarias para
              mantener tu sesión iniciada (cookie de autenticación). No usamos
              cookies de marketing, publicidad ni analítica que requieran
              consentimiento previo bajo el RGPD.
            </p>
          </Section>

          <Section title="8. Menores">
            <p>
              Welist no está dirigido a menores de 13 años. No recogemos
              intencionadamente datos de menores. Si crees que un menor ha
              creado una cuenta, contacta con nosotros y la eliminaremos.
            </p>
          </Section>

          <Section title="9. Seguridad">
            <p>
              Aplicamos medidas técnicas y organizativas razonables para
              proteger tus datos: cifrado en tránsito (HTTPS), contraseñas
              almacenadas como hash con sal, control de acceso a la
              infraestructura. Ningún sistema es 100 % seguro; en caso de
              brecha que afecte tus derechos, te informaremos conforme exige la
              normativa.
            </p>
          </Section>

          <Section title="10. Cambios en esta política">
            <p>
              Podemos actualizar esta política para reflejar cambios en la app
              o en la normativa. Indicaremos siempre la fecha de la última
              actualización al inicio del documento. Si los cambios son
              sustanciales, te lo notificaremos por email o desde la app antes
              de que entren en vigor.
            </p>
          </Section>
        </div>

        <p className="mt-10 text-xs text-gray-500 dark:text-[#a0a09c]">
          <Link
            to="/terms"
            className="underline hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
          >
            Términos del servicio
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
