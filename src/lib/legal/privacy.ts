/**
 * Aviso de Privacidad Integral de Dopilot.
 *
 * BORRADOR: requiere revisión legal antes de considerarse definitivo.
 * Redactado conforme a la Ley Federal de Protección de Datos Personales en
 * Posesión de los Particulares publicada en el DOF el 20 de marzo de 2025.
 * Si cambias el contenido de forma material, actualiza `LEGAL_VERSION`.
 */
import { LEGAL_ENTITY, type LegalSection } from "./company";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "1. Identidad y domicilio del responsable",
    content: [
      `${LEGAL_ENTITY.name} (“Sound Mind”), con domicilio en ${LEGAL_ENTITY.address}, opera la plataforma Dopilot y es responsable del tratamiento de los datos personales que se describen en este Aviso de Privacidad.`,
      `Para cualquier asunto relacionado con tus datos personales puedes escribir a ${LEGAL_ENTITY.email}.`,
    ],
  },
  {
    title: "2. Quién responde por cada tipo de dato",
    content: [
      "Sound Mind es responsable de los datos de las cuentas de usuario (médicos, personal del consultorio y pacientes) y de los datos necesarios para operar la plataforma, como el registro, la agenda, los recordatorios y la facturación de suscripciones.",
      "Los datos clínicos (expediente, notas de consulta, diagnósticos, recetas y archivos clínicos) que un médico registra sobre sus pacientes son responsabilidad de ese médico o de su consultorio. Respecto de esos datos, Sound Mind actúa como encargado: los almacena y procesa únicamente por cuenta del médico, conforme a sus instrucciones y para prestarle el servicio, sin usarlos para fines propios.",
      `Si eres paciente y quieres ejercer tus derechos sobre tu expediente clínico, dirígete al médico o consultorio que te atiende. Si nos escribes a ${LEGAL_ENTITY.email}, haremos llegar tu solicitud al médico correspondiente y le daremos el apoyo técnico necesario para atenderla.`,
    ],
  },
  {
    title: "3. Datos personales que tratamos",
    content: [
      "Según la forma en que uses Dopilot, podemos tratar los siguientes datos:",
      [
        "Identificación y contacto: nombre, correo electrónico, teléfono, fotografía de perfil, fecha de nacimiento, género y domicilio.",
        "Datos profesionales de médicos: especialidad, cédula profesional, consultorio, dirección y ubicación del consultorio, horarios, servicios y precios.",
        "Datos de la cuenta: credenciales de acceso (la contraseña se guarda cifrada), rol, preferencias de notificación y aceptación de estos documentos.",
        "Datos de citas: fechas, horarios, motivo de consulta y comunicaciones relacionadas con la cita.",
        "Datos patrimoniales o financieros limitados: plan contratado y estado de pago de la suscripción del médico, y en su caso la aseguradora y número de póliza que el paciente decida registrar. Los datos completos de tarjetas los recibe directamente el procesador de pagos; Sound Mind no los almacena.",
        "Datos técnicos: dirección IP, tipo de dispositivo y navegador, y registros de actividad necesarios para la seguridad y el funcionamiento de la plataforma.",
        "Llamadas con el asistente de voz: número telefónico y el contenido de la conversación necesario para agendar o gestionar citas, que puede procesarse y, en su caso, grabarse o transcribirse.",
      ],
      "Datos personales sensibles: Dopilot trata datos de salud, como síntomas, alergias, medicamentos, antecedentes médicos, notas clínicas, diagnósticos, recetas y archivos clínicos. Estos datos solo se tratan con tu consentimiento expreso, que otorgas al aceptar este Aviso dentro de la plataforma, salvo en los casos de excepción que prevé la ley.",
    ],
  },
  {
    title: "4. Finalidades necesarias para el servicio",
    content: [
      "Usamos tus datos para las siguientes finalidades, que son necesarias para prestarte el servicio:",
      [
        "Crear, verificar y administrar tu cuenta y autenticar tu acceso.",
        "Mostrar el perfil público de los médicos y permitir la búsqueda y reserva de citas.",
        "Agendar, confirmar, reprogramar y cancelar citas, y enviar los recordatorios y avisos relacionados por los canales que elijas (correo electrónico, SMS, WhatsApp o llamada).",
        "Permitir al médico llevar el expediente clínico y el seguimiento de sus pacientes.",
        "Atender llamadas mediante el asistente de voz del consultorio.",
        "Cobrar y administrar las suscripciones de los médicos.",
        "Brindar soporte, mantener la seguridad de la plataforma y prevenir fraudes o accesos no autorizados.",
        "Cumplir obligaciones legales y atender requerimientos de autoridades competentes.",
      ],
    ],
  },
  {
    title: "5. Finalidades secundarias",
    content: [
      "Además, podemos usar tus datos para las siguientes finalidades, que no son necesarias para el servicio:",
      [
        "Elaborar estadísticas y análisis para mejorar Dopilot. Para ello usamos datos agregados o anonimizados que no permiten identificarte.",
        "Enviarte novedades, promociones e información sobre productos y servicios de Dopilot y Sound Mind.",
      ],
      `Puedes negarte a estas finalidades en cualquier momento, sin que ello afecte el servicio, escribiendo a ${LEGAL_ENTITY.email} con el asunto “Finalidades secundarias”, o usando la opción para dejar de recibir mensajes incluida en cada comunicación promocional.`,
    ],
  },
  {
    title: "6. Con quién compartimos tus datos",
    content: [
      "Para prestar el servicio, Sound Mind se apoya en proveedores que tratan datos personales por nuestra cuenta, únicamente para las finalidades de este Aviso y bajo obligaciones de confidencialidad y seguridad. Algunos de ellos se ubican fuera de México:",
      [
        "Alojamiento de la aplicación, base de datos, almacenamiento de archivos y analítica de uso (Vercel y sus proveedores de infraestructura).",
        "Procesamiento de pagos (Stripe).",
        "Envío de mensajes por SMS y WhatsApp (Sent).",
        "Llamadas con asistente de voz (Vapi).",
        "Protección contra abuso y control de tráfico (Upstash).",
        "Mapas para mostrar la ubicación de consultorios (CARTO).",
      ],
      "Cuando reservas una cita, tus datos se comparten con el médico o consultorio que elegiste, porque es necesario para atenderte. También podemos compartir datos con autoridades cuando una ley o una orden de autoridad competente lo exija. Sound Mind no vende tus datos personales.",
    ],
  },
  {
    title: "7. Derechos ARCO",
    content: [
      "Tienes derecho a acceder a tus datos personales, rectificarlos si son inexactos o incompletos, cancelarlos cuando consideres que no se requieren para alguna de las finalidades de este Aviso, y oponerte a su tratamiento para fines específicos (derechos ARCO).",
      `Para ejercerlos, envía una solicitud a ${LEGAL_ENTITY.email} que incluya:`,
      [
        "Tu nombre y un medio para comunicarte la respuesta.",
        "Una copia de tu identificación oficial o, si actúas en nombre de otra persona, el documento que acredite tu representación.",
        "La descripción clara de los datos y del derecho que quieres ejercer.",
        "Cualquier documento que facilite la localización de tus datos.",
      ],
      "Responderemos dentro de los plazos que establece la ley. Muchos de tus datos de cuenta también puedes consultarlos y corregirlos directamente desde tu perfil.",
    ],
  },
  {
    title: "8. Revocación del consentimiento y límites al uso de tus datos",
    content: [
      `Puedes revocar el consentimiento que nos diste para el tratamiento de tus datos enviando una solicitud a ${LEGAL_ENTITY.email} con los mismos requisitos que una solicitud ARCO. Ten en cuenta que, si la revocación se refiere a datos necesarios para el servicio, es posible que no podamos seguir prestándotelo.`,
      "Para limitar el uso de tus datos, puedes desactivar los recordatorios y canales de contacto desde tus preferencias de notificación en el perfil, darte de baja de las comunicaciones promocionales o escribirnos al correo indicado.",
    ],
  },
  {
    title: "9. Cookies y tecnologías similares",
    content: [
      "Dopilot usa cookies estrictamente necesarias para mantener tu sesión iniciada y proteger tu cuenta, y guarda en tu navegador preferencias como el tema visual. También usamos herramientas de analítica que miden el uso de la plataforma de forma agregada. No usamos cookies con fines publicitarios.",
    ],
  },
  {
    title: "10. Seguridad",
    content: [
      "Aplicamos medidas de seguridad administrativas, técnicas y físicas para proteger tus datos contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no autorizado, entre ellas la transmisión cifrada, el almacenamiento cifrado de contraseñas y el control de acceso por rol, de modo que cada usuario solo vea la información que le corresponde.",
    ],
  },
  {
    title: "11. Cambios a este Aviso",
    content: [
      "Podemos modificar este Aviso por cambios legales, en nuestros servicios o en nuestras prácticas. La versión vigente estará siempre disponible en Dopilot, en la sección de perfil y en esta página. Cuando el cambio sea relevante, te lo informaremos dentro de la plataforma y, si se requiere, te pediremos nuevamente tu consentimiento.",
    ],
  },
  {
    title: "12. Autoridad",
    content: [
      "Si consideras que tu derecho a la protección de datos personales ha sido vulnerado, puedes acudir ante la Secretaría Anticorrupción y Buen Gobierno, autoridad competente en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
    ],
  },
];
