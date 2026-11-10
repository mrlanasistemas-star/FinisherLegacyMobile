import { t, type Translate } from '@/i18n';

import type { SessionProgress } from './activation-session';
import type { ActivationFailure } from './nfc-errors';

export interface FailureCopy {
  title: string;
  body: string;
  /** Primary action label, if the screen should offer one. */
  action: 'retry' | 'settings' | 'edit_code' | 'login' | 'none';
}

/** A function, not a table: the copy is resolved in the language active when it is shown. */
function apiCopy(code: string): FailureCopy | undefined {
  switch (code) {
    case 'ACTIVATION_CODE_INVALID':
      return {
        title: t('Código no válido'),
        body: t('Revisa el código de la tarjeta que viene en tu empaque. Son 12 caracteres (XXXX-XXXX-XXXX).'),
        action: 'edit_code',
      };
    case 'TAG_ALREADY_ACTIVATED':
      return {
        title: t('Este Finisher Legacy ya está activado'),
        body: t('Ya pertenece a una historia. Si es tuyo, lo encuentras en tu Legacy; si no, escríbenos a hola@finisherlegacy.com.'),
        action: 'none',
      };
    case 'TAG_NOT_ACTIVATABLE':
      return {
        title: t('No se puede activar'),
        body: t('Este Finisher Legacy no está disponible para activarse. Escríbenos a hola@finisherlegacy.com y lo revisamos.'),
        action: 'none',
      };
    case 'TAG_UID_MISMATCH':
      return {
        title: t('El chip no coincide con tu código'),
        body: t('El código de tu tarjeta pertenece a otro Finisher Legacy. Acerca el que venía en el mismo empaque.'),
        action: 'retry',
      };
    default:
      return undefined;
  }
}

/** Calm copy for every failure, in the active language — never a raw error. */
export function failureCopy(failure: ActivationFailure): FailureCopy {
  switch (failure.kind) {
    case 'module_unavailable':
      return {
        title: t('Actualiza Finisher Legacy'),
        body: t('Esta versión de la app aún no puede escribir chips NFC. Instala la versión más reciente y vuelve a intentarlo.'),
        action: 'none',
      };
    case 'unsupported':
      return {
        title: t('Tu teléfono no tiene NFC'),
        body: t('Para activar tu Finisher Legacy necesitas un teléfono con NFC. Puedes hacerlo desde el teléfono de alguien de confianza iniciando sesión con tu cuenta.'),
        action: 'none',
      };
    case 'disabled':
      return {
        title: t('Activa el NFC de tu teléfono'),
        body: t('El NFC está apagado. Enciéndelo en los ajustes y vuelve aquí.'),
        action: 'settings',
      };
    case 'cancelled':
      return { title: t('Lectura cancelada'), body: t('Cuando quieras, inténtalo de nuevo.'), action: 'retry' };
    case 'timeout':
      return {
        title: t('No detectamos tu Finisher Legacy'),
        body: t('Acércalo al centro de la parte trasera del teléfono (en iPhone, a la parte superior) y mantenlo quieto unos segundos.'),
        action: 'retry',
      };
    case 'tag_lost':
      return {
        title: t('Se movió antes de terminar'),
        body: t('Vuelve a acercarlo y no lo muevas hasta sentir la vibración de éxito.'),
        action: 'retry',
      };
    case 'busy':
      return { title: t('Ya hay una lectura en curso'), body: t('Espera un momento e inténtalo otra vez.'), action: 'retry' };
    case 'read_only':
      return {
        title: t('Este chip está bloqueado'),
        body: t('Está protegido contra escritura y no se puede activar. Escríbenos a hola@finisherlegacy.com.'),
        action: 'none',
      };
    case 'not_ndef':
      return {
        title: t('Este chip no es compatible'),
        body: t('No parece un Finisher Legacy. Asegúrate de acercar el que viene en tu empaque.'),
        action: 'retry',
      };
    case 'too_small':
      return {
        title: t('Este chip no tiene espacio'),
        body: t('No es un Finisher Legacy original. Escríbenos a hola@finisherlegacy.com.'),
        action: 'none',
      };
    case 'verify_failed':
      return {
        title: t('No pudimos verificarlo'),
        body: t('La escritura no se confirmó. Acércalo de nuevo y mantenlo quieto.'),
        action: 'retry',
      };
    case 'tag_changed':
      return { title: t('Es otro chip'), body: t('Acerca el mismo Finisher Legacy que leímos antes.'), action: 'retry' };
    case 'different_fl_tag':
      return {
        title: t('Este chip ya es otro Finisher Legacy'),
        body: t('Ya tiene el enlace de otro Finisher Legacy y no lo vamos a cambiar. Acerca el que venía con tu tarjeta.'),
        action: 'retry',
      };
    case 'unsafe_url':
      return {
        title: t('No pudimos preparar tu Finisher Legacy'),
        body: t('Por seguridad no escribimos nada. Intenta más tarde o escríbenos a hola@finisherlegacy.com.'),
        action: 'none',
      };
    case 'network':
      return { title: t('Sin conexión'), body: t('Conéctate a Internet y vuelve a intentarlo.'), action: 'retry' };
    case 'rate_limited':
      return { title: t('Demasiados intentos'), body: t('Espera unos minutos y vuelve a intentarlo.'), action: 'retry' };
    case 'unauthenticated':
      return { title: t('Tu sesión expiró'), body: t('Inicia sesión de nuevo para continuar.'), action: 'login' };
    case 'api':
      return (
        (failure.code ? apiCopy(failure.code) : undefined) ?? {
          title: t('No pudimos activarlo'),
          body: failure.message ?? t('Intenta de nuevo en un momento.'),
          action: 'retry',
        }
      );
    default:
      return { title: t('Algo salió mal'), body: t('No se escribió nada inesperado. Intenta de nuevo.'), action: 'retry' };
  }
}

/**
 * Copy of each step of the NFC session. Takes the translator of the component
 * (`useI18n()`) so it follows the app language.
 */
export function progressCopy(progress: SessionProgress, t: Translate): { title: string; body: string } {
  switch (progress) {
    case 'waiting':
      return { title: t('Acerca tu Finisher Legacy'), body: t('Mantén el Tag en la parte trasera de tu teléfono.') };
    case 'detected':
      return { title: t('Lo encontramos'), body: t('No lo muevas…') };
    case 'authorizing':
      return { title: t('Autorizando'), body: t('Validando tu código de activación…') };
    case 'writing':
      return { title: t('Escribiendo'), body: t('Grabando tu enlace permanente. No lo muevas.') };
    case 'verifying':
      return { title: t('Verificando'), body: t('Comprobando que quedó perfecto…') };
    case 'confirming':
      return { title: t('Casi listo'), body: t('Guardando tu activación…') };
  }
}
