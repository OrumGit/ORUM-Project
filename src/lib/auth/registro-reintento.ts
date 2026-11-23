/**
 * Volver a registrarse sin quedar atascado (23/11/2026).
 *
 * Si alguien vuelve a «Tus datos» para corregir el correo, o abandona y lo
 * intenta otra vez, su cédula (o su correo) ya tiene un registro pendiente:
 * los índices únicos impedían crear el nuevo, la pantalla decía «revisa tu
 * correo» y el código nunca llegaba. Un registro anterior se REEMPLAZA solo si
 * no llegó a nada: correo sin confirmar, sin ficha y sin pago abierto. Uno con
 * el correo ya confirmado es una cuenta: esa persona entra y paga desde
 * «Completa tu membresía».
 *
 * Pura: la acción reúne los registros y borra los que esta función devuelve.
 */

export type RegistroPrevio = {
  authUserId: string
  correoConfirmado: boolean
  conFicha: boolean
  conPago: boolean
}

/** Los usuarios de autenticación que se pueden borrar para registrarse de nuevo. */
export function registrosReemplazables(previos: readonly RegistroPrevio[]): string[] {
  return previos
    .filter((r) => !r.correoConfirmado && !r.conFicha && !r.conPago)
    .map((r) => r.authUserId)
}
