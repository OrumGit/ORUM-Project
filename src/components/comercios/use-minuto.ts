'use client'

import { useSyncExternalStore } from 'react'

/*
  El minuto actual, para lo que dice «ahora»: el horario de una sede y si un
  beneficio aplica. Las fichas salen de caché, así que lo de «ahora» se
  calcula en el navegador. `null` en el servidor y en la hidratación: no hay
  desajuste ni parpadeo, el estado aparece al montar.
*/

function suscribirAlMinuto(avisar: () => void) {
  const id = setInterval(avisar, 60_000)
  return () => clearInterval(id)
}

/** Estable dentro del minuto: React solo repinta al cambiar. */
const minutoActual = () => Math.floor(Date.now() / 60_000)
const enServidor = () => null

/** El instante de este minuto, o `null` mientras no se sepa (servidor). */
export function useInstanteAlMinuto(): Date | null {
  const minuto = useSyncExternalStore(suscribirAlMinuto, minutoActual, enServidor)
  return minuto === null ? null : new Date(minuto * 60_000)
}
