/**
 * Términos y condiciones de Dopilot.
 *
 * BORRADOR: este texto requiere revisión legal antes de considerarse
 * definitivo. Al cambiar el contenido de forma material, actualiza
 * `TERMS_VERSION`: todos los usuarios volverán a ver el modal de aceptación
 * una sola vez con la nueva versión.
 */
export const TERMS_VERSION = "2026-11-12";

export const TERMS_UPDATED_LABEL = "12 de noviembre de 2026";

export type TermsSection = {
  title: string;
  paragraphs: string[];
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "1. Aceptación",
    paragraphs: [
      "Estos Términos y Condiciones regulan el acceso y uso de Dopilot (la “Plataforma”), un servicio para la gestión de consultorios médicos que incluye agenda, reservas en línea, expediente y seguimiento clínico, recordatorios y comunicación con pacientes.",
      "Al crear una cuenta o usar la Plataforma, aceptas estos Términos. Si no estás de acuerdo con ellos, no debes usar la Plataforma.",
    ],
  },
  {
    title: "2. Cuentas de usuario",
    paragraphs: [
      "Debes proporcionar información veraz, completa y actualizada al registrarte, y eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta.",
      "Debes avisarnos de inmediato si sospechas un uso no autorizado de tu cuenta. Podemos suspender o cancelar cuentas que incumplan estos Términos o que se usen de forma fraudulenta.",
    ],
  },
  {
    title: "3. Uso por profesionales de la salud",
    paragraphs: [
      "Los médicos y demás profesionales que usan la Plataforma declaran contar con la cédula, permisos y habilitaciones que exige la ley para ejercer, y son los únicos responsables de sus diagnósticos, tratamientos, recetas y decisiones clínicas.",
      "Dopilot es una herramienta de apoyo administrativo y de registro. No presta servicios médicos ni sustituye el criterio profesional. El profesional es responsable de que el contenido que registra cumpla con la normativa sanitaria aplicable, incluida la relativa al expediente clínico, y de contar con el consentimiento de sus pacientes cuando sea necesario.",
    ],
  },
  {
    title: "4. Uso por pacientes",
    paragraphs: [
      "La Plataforma te permite buscar profesionales, reservar y administrar citas, consultar tu historial y recibir recordatorios. La relación médico-paciente se establece directamente entre tú y el profesional que elijas.",
      "Dopilot no es un servicio de emergencias. Si tienes una urgencia médica, llama al 911 o acude al servicio de urgencias más cercano.",
    ],
  },
  {
    title: "5. Datos personales y privacidad",
    paragraphs: [
      "Tratamos datos personales, incluidos datos de salud que la ley considera sensibles, conforme a la legislación mexicana aplicable en materia de protección de datos personales y a nuestro Aviso de Privacidad.",
      "Aplicamos medidas de seguridad administrativas, técnicas y físicas para proteger la información. El acceso al expediente se limita a los profesionales autorizados y a las finalidades del servicio. Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) en los términos del Aviso de Privacidad.",
    ],
  },
  {
    title: "6. Comunicaciones y recordatorios",
    paragraphs: [
      "Con tu consentimiento, la Plataforma puede enviarte recordatorios de citas y mensajes de seguimiento por correo electrónico, SMS, WhatsApp, llamada u otros canales. Puedes retirar ese consentimiento en cualquier momento desde tu perfil.",
      "Las comunicaciones operativas indispensables para el servicio, como confirmaciones o avisos de seguridad de tu cuenta, pueden enviarse aun sin ese consentimiento.",
    ],
  },
  {
    title: "7. Pagos y suscripciones",
    paragraphs: [
      "Algunas funciones para profesionales pueden requerir un plan de pago. Los precios, periodos de facturación y condiciones de cancelación se muestran antes de contratar. Los pagos se procesan mediante proveedores externos y Dopilot no almacena los datos completos de tus tarjetas.",
    ],
  },
  {
    title: "8. Uso aceptable",
    paragraphs: [
      "No debes usar la Plataforma para fines ilícitos, suplantar identidades, acceder sin autorización a información de terceros, interferir con su funcionamiento ni cargar contenido malicioso o que infrinja derechos de terceros.",
    ],
  },
  {
    title: "9. Propiedad intelectual",
    paragraphs: [
      "El software, diseño, marcas y contenidos de Dopilot son propiedad de sus titulares y están protegidos por la ley. La información que registras sigue siendo tuya o de tu consultorio; nos otorgas únicamente la autorización necesaria para almacenarla y procesarla con el fin de prestar el servicio.",
    ],
  },
  {
    title: "10. Disponibilidad y responsabilidad",
    paragraphs: [
      "Procuramos que la Plataforma esté disponible y funcione correctamente, pero puede haber interrupciones por mantenimiento, fallas técnicas o causas ajenas a nosotros. En la medida permitida por la ley, Dopilot no es responsable de daños indirectos derivados del uso o la imposibilidad de uso de la Plataforma, ni de los actos u omisiones de los profesionales de la salud.",
    ],
  },
  {
    title: "11. Cambios a estos Términos",
    paragraphs: [
      "Podemos actualizar estos Términos. Cuando el cambio sea relevante te pediremos aceptarlo de nuevo al entrar a la Plataforma. La versión vigente siempre estará disponible para consulta en tu perfil.",
    ],
  },
  {
    title: "12. Legislación aplicable",
    paragraphs: [
      "Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes en México, sin perjuicio de los derechos que te otorga la legislación de protección al consumidor.",
    ],
  },
];
