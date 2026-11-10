import type { ActivationFailure } from './nfc-errors';

export interface FailureCopy {
  title: string;
  body: string;
  /** Primary action label, if the screen should offer one. */
  action: 'retry' | 'settings' | 'edit_code' | 'login' | 'none';
}

const API_COPY: Record<string, FailureCopy> = {
  ACTIVATION_CODE_INVALID: {
    title: 'Código no válido',
    body: 'Revisa el código de la tarjeta que viene en tu empaque. Son 12 caracteres (XXXX-XXXX-XXXX).',
    action: 'edit_code',
  },
  TAG_ALREADY_ACTIVATED: {
    title: 'Este Finisher Legacy ya está activado',
    body: 'Ya pertenece a una historia. Si es tuyo, lo encuentras en tu Legacy; si no, escríbenos a hola@finisherlegacy.com.',
    action: 'none',
  },
  TAG_NOT_ACTIVATABLE: {
    title: 'No se puede activar',
    body: 'Este Finisher Legacy no está disponible para activarse. Escríbenos a hola@finisherlegacy.com y lo revisamos.',
    action: 'none',
  },
  TAG_UID_MISMATCH: {
    title: 'El chip no coincide con tu código',
    body: 'El código de tu tarjeta pertenece a otro Finisher Legacy. Acerca el que venía en el mismo empaque.',
    action: 'retry',
  },
};

/** Calm Spanish copy for every failure — never a raw error. */
export function failureCopy(failure: ActivationFailure): FailureCopy {
  switch (failure.kind) {
    case 'module_unavailable':
      return {
        title: 'Actualiza Finisher Legacy',
        body: 'Esta versión de la app aún no puede escribir chips NFC. Instala la versión más reciente y vuelve a intentarlo.',
        action: 'none',
      };
    case 'unsupported':
      return {
        title: 'Tu teléfono no tiene NFC',
        body: 'Para activar tu Finisher Legacy necesitas un teléfono con NFC. Puedes hacerlo desde el teléfono de alguien de confianza iniciando sesión con tu cuenta.',
        action: 'none',
      };
    case 'disabled':
      return {
        title: 'Activa el NFC de tu teléfono',
        body: 'El NFC está apagado. Enciéndelo en los ajustes y vuelve aquí.',
        action: 'settings',
      };
    case 'cancelled':
      return { title: 'Lectura cancelada', body: 'Cuando quieras, inténtalo de nuevo.', action: 'retry' };
    case 'timeout':
      return {
        title: 'No detectamos tu Finisher Legacy',
        body: 'Acércalo al centro de la parte trasera del teléfono (en iPhone, a la parte superior) y mantenlo quieto unos segundos.',
        action: 'retry',
      };
    case 'tag_lost':
      return {
        title: 'Se movió antes de terminar',
        body: 'Vuelve a acercarlo y no lo muevas hasta sentir la vibración de éxito.',
        action: 'retry',
      };
    case 'busy':
      return { title: 'Ya hay una lectura en curso', body: 'Espera un momento e inténtalo otra vez.', action: 'retry' };
    case 'read_only':
      return {
        title: 'Este chip está bloqueado',
        body: 'Está protegido contra escritura y no se puede activar. Escríbenos a hola@finisherlegacy.com.',
        action: 'none',
      };
    case 'not_ndef':
      return {
        title: 'Este chip no es compatible',
        body: 'No parece un Finisher Legacy. Asegúrate de acercar el que viene en tu empaque.',
        action: 'retry',
      };
    case 'too_small':
      return {
        title: 'Este chip no tiene espacio',
        body: 'No es un Finisher Legacy original. Escríbenos a hola@finisherlegacy.com.',
        action: 'none',
      };
    case 'verify_failed':
      return {
        title: 'No pudimos verificarlo',
        body: 'La escritura no se confirmó. Acércalo de nuevo y mantenlo quieto.',
        action: 'retry',
      };
    case 'tag_changed':
      return { title: 'Es otro chip', body: 'Acerca el mismo Finisher Legacy que leímos antes.', action: 'retry' };
    case 'different_fl_tag':
      return {
        title: 'Este chip ya es otro Finisher Legacy',
        body: 'Ya tiene el enlace de otro Finisher Legacy y no lo vamos a cambiar. Acerca el que venía con tu tarjeta.',
        action: 'retry',
      };
    case 'unsafe_url':
      return {
        title: 'No pudimos preparar tu Finisher Legacy',
        body: 'Por seguridad no escribimos nada. Intenta más tarde o escríbenos a hola@finisherlegacy.com.',
        action: 'none',
      };
    case 'network':
      return { title: 'Sin conexión', body: 'Conéctate a Internet y vuelve a intentarlo.', action: 'retry' };
    case 'rate_limited':
      return { title: 'Demasiados intentos', body: 'Espera unos minutos y vuelve a intentarlo.', action: 'retry' };
    case 'unauthenticated':
      return { title: 'Tu sesión expiró', body: 'Inicia sesión de nuevo para continuar.', action: 'login' };
    case 'api':
      return (
        (failure.code ? API_COPY[failure.code] : undefined) ?? {
          title: 'No pudimos activarlo',
          body: failure.message ?? 'Intenta de nuevo en un momento.',
          action: 'retry',
        }
      );
    default:
      return { title: 'Algo salió mal', body: 'No se escribió nada inesperado. Intenta de nuevo.', action: 'retry' };
  }
}

export const PROGRESS_COPY = {
  waiting: { title: 'Acerca tu Finisher Legacy', body: 'Mantén el tag en la parte trasera de tu teléfono.' },
  detected: { title: 'Lo encontramos', body: 'No lo muevas…' },
  authorizing: { title: 'Autorizando', body: 'Validando tu código de activación…' },
  writing: { title: 'Escribiendo', body: 'Grabando tu enlace permanente. No lo muevas.' },
  verifying: { title: 'Verificando', body: 'Comprobando que quedó perfecto…' },
  confirming: { title: 'Casi listo', body: 'Guardando tu activación…' },
} as const;
