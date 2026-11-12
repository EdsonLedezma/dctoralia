/**
 * Términos y condiciones de Dopilot.
 *
 * BORRADOR: este texto requiere revisión legal antes de considerarse
 * definitivo. Si cambias el contenido de forma material, actualiza
 * `LEGAL_VERSION` en `./company.ts`.
 */
import { LEGAL_ENTITY, type LegalSection } from "./company";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Aceptación",
    content: [
      `Estos Términos y Condiciones regulan el acceso y uso de Dopilot (la “Plataforma”), operada por ${LEGAL_ENTITY.name} (“Sound Mind”), con domicilio en ${LEGAL_ENTITY.address}. Dopilot es un servicio para la gestión de consultorios médicos que incluye agenda, reservas en línea, expediente y seguimiento clínico, recordatorios y comunicación con pacientes.`,
      "Al crear una cuenta o usar la Plataforma, aceptas estos Términos. Si no estás de acuerdo con ellos, no debes usar la Plataforma.",
    ],
  },
  {
    title: "2. Cuentas de usuario",
    content: [
      "Debes proporcionar información veraz, completa y actualizada al registrarte, y eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta.",
      "Debes avisarnos de inmediato si sospechas un uso no autorizado de tu cuenta. Podemos suspender o cancelar cuentas que incumplan estos Términos o que se usen de forma fraudulenta.",
    ],
  },
  {
    title: "3. Uso por profesionales de la salud",
    content: [
      "Los médicos y demás profesionales que usan la Plataforma declaran contar con la cédula, permisos y habilitaciones que exige la ley para ejercer, y son los únicos responsables de sus diagnósticos, tratamientos, recetas y decisiones clínicas.",
      "Dopilot es una herramienta de apoyo administrativo y de registro. No presta servicios médicos ni sustituye el criterio profesional. El profesional es responsable de que el contenido que registra cumpla con la normativa sanitaria aplicable, incluida la relativa al expediente clínico, y de contar con el consentimiento de sus pacientes cuando sea necesario.",
      "Respecto de los datos clínicos de sus pacientes, el profesional actúa como responsable y Sound Mind como encargado que los trata por su cuenta, en los términos del Aviso de Privacidad.",
    ],
  },
  {
    title: "4. Uso por pacientes",
    content: [
      "La Plataforma te permite buscar profesionales, reservar y administrar citas, consultar tu historial y recibir recordatorios. La relación médico-paciente se establece directamente entre tú y el profesional que elijas.",
      "Dopilot no es un servicio de emergencias. Si tienes una urgencia médica, llama al 911 o acude al servicio de urgencias más cercano.",
    ],
  },
  {
    title: "5. Datos personales y privacidad",
    content: [
      "El tratamiento de tus datos personales, incluidos los datos de salud, se rige por nuestro Aviso de Privacidad, disponible en tu perfil y en la página “Aviso de privacidad” de Dopilot.",
    ],
  },
  {
    title: "6. Comunicaciones y recordatorios",
    content: [
      "Con tu consentimiento, la Plataforma puede enviarte recordatorios de citas y mensajes de seguimiento por correo electrónico, SMS, WhatsApp, llamada u otros canales. Puedes retirar ese consentimiento en cualquier momento desde tu perfil.",
      "Las comunicaciones operativas indispensables para el servicio, como confirmaciones o avisos de seguridad de tu cuenta, pueden enviarse aun sin ese consentimiento.",
    ],
  },
  {
    title: "7. Pagos y suscripciones",
    content: [
      "Algunas funciones para profesionales pueden requerir un plan de pago. Los precios, periodos de facturación y condiciones de cancelación se muestran antes de contratar. Los pagos se procesan mediante proveedores externos y Dopilot no almacena los datos completos de tus tarjetas.",
    ],
  },
  {
    title: "8. Uso aceptable",
    content: [
      "No debes usar la Plataforma para fines ilícitos, suplantar identidades, acceder sin autorización a información de terceros, interferir con su funcionamiento ni cargar contenido malicioso o que infrinja derechos de terceros.",
    ],
  },
  {
    title: "9. Propiedad intelectual",
    content: [
      "El software, diseño, marcas y contenidos de Dopilot son propiedad de Sound Mind o de sus titulares y están protegidos por la ley. La información que registras sigue siendo tuya o de tu consultorio; nos otorgas únicamente la autorización necesaria para almacenarla y procesarla con el fin de prestar el servicio.",
    ],
  },
  {
    title: "10. Disponibilidad y responsabilidad",
    content: [
      "Procuramos que la Plataforma esté disponible y funcione correctamente, pero puede haber interrupciones por mantenimiento, fallas técnicas o causas ajenas a nosotros. En la medida permitida por la ley, Sound Mind no es responsable de daños indirectos derivados del uso o la imposibilidad de uso de la Plataforma, ni de los actos u omisiones de los profesionales de la salud.",
    ],
  },
  {
    title: "11. Cambios a estos Términos",
    content: [
      "Podemos actualizar estos Términos. Cuando el cambio sea relevante te pediremos aceptarlo de nuevo al entrar a la Plataforma. La versión vigente siempre estará disponible para consulta en tu perfil.",
    ],
  },
  {
    title: "12. Contacto y legislación aplicable",
    content: [
      `Para cualquier duda sobre estos Términos puedes escribir a ${LEGAL_ENTITY.email}.`,
      "Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes en México, sin perjuicio de los derechos que te otorga la legislación de protección al consumidor.",
    ],
  },
];
