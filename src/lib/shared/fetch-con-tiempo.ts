/*
  TIEMPO MÁXIMO PARA UN `fetch`  (06/11/2026, prueba de carga)

  `supabase-js` usa el `fetch` de siempre, que no tiene límite. Con Supabase
  rechazando conexiones, 2.155 funciones de Vercel se quedaron esperando hasta
  que la plataforma las mató a los 300 s. Esto le pone un techo: pasado
  `tiempoMs`, la petición se cancela con un `TimeoutError` y la función queda
  libre.

  Respeta la cancelación de quien llama: si ya traía su propia señal, se
  combinan (gana la que salte primero).
*/
export function fetchConTiempoMaximo(tiempoMs: number, base: typeof fetch = fetch): typeof fetch {
  return (entrada, init) => {
    const limite = AbortSignal.timeout(tiempoMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite
    return base(entrada, { ...init, signal })
  }
}
